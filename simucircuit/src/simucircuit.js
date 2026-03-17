(function () {
    'use strict';

    const COMP_WIDTH = 80;
    const COMP_HEIGHT = 44;
    const NODE_R = 6;

    const defaults = {
        // Values here are RAW strings the user would type (no Ω/V/A/F glyphs).
        resistor: { label: 'R', value: '1k' },
        capacitor: { label: 'C', value: '1u' },
        vsource: { label: 'V', value: '5' },
        isource: { label: 'I', value: '1' },
        // AC sources use: amplitude@freqHz (example: 5@60)
        vsource_ac: { label: 'VA', value: '5@60' },
        isource_ac: { label: 'IA', value: '1@60' },
        ground: { label: 'GND', value: '' },
        multimeter: { label: 'MM', value: '' },
        scope: { label: 'SC', value: '' }
    };

    let componentId = 0;
    let wireId = 0;
    const components = new Map();
    const wires = new Map();

    const workspace = document.getElementById('workspace');
    const wireLayer = document.getElementById('wire-layer');
    const componentsLayer = document.getElementById('components-layer');
    let selectedCompId = null;
    let selectedWireId = null;

    // Simple context menu
    const ctxMenu = document.createElement('div');
    ctxMenu.id = 'simu-context-menu';
    ctxMenu.className = 'ctx-menu hidden';
    ctxMenu.innerHTML = [
        '<div class="ctx-menu-item" data-action="edit">Edit value…</div>',
        '<div class="ctx-menu-item" data-action="delete">Delete</div>',
        '<div class="ctx-menu-sep"></div>',
        '<div class="ctx-menu-item" data-action="rot-cw">Rotate 90° CW</div>',
        '<div class="ctx-menu-item" data-action="rot-ccw">Rotate 90° CCW</div>',
        '<div class="ctx-menu-item" data-action="flip-h">Flip horizontal</div>',
        '<div class="ctx-menu-item" data-action="flip-v">Flip vertical</div>'
    ].join('');
    document.body.appendChild(ctxMenu);
    let ctxMenuFor = null;
    let lastToolReadings = new Map();

    // Modal + overlay
    const overlayEl = document.getElementById('simu-overlay');
    const modalEl = document.getElementById('simu-modal');
    const modalTitleEl = document.getElementById('simu-modal-title');
    const modalBodyEl = document.getElementById('simu-modal-body');
    const modalOkEl = document.getElementById('simu-modal-ok');
    const modalCancelEl = document.getElementById('simu-modal-cancel');
    let modalOkHandler = null;
    let modalCancelHandler = null;

    function closeModal() {
        if (!modalEl || !overlayEl) return;
        modalEl.classList.add('hidden');
        overlayEl.classList.add('hidden');
        modalOkHandler = null;
        modalCancelHandler = null;
    }

    function openModal(opts) {
        if (!modalEl || !overlayEl) return;
        const { title, bodyHTML, okText, cancelText, showCancel = true, onOk, onCancel } = opts || {};
        modalTitleEl.textContent = title || '';
        modalBodyEl.innerHTML = bodyHTML || '';
        modalOkEl.textContent = okText || 'OK';
        modalCancelEl.textContent = cancelText || 'Cancel';
        modalCancelEl.style.display = showCancel ? '' : 'none';
        overlayEl.classList.remove('hidden');
        modalEl.classList.remove('hidden');
        modalOkHandler = onOk || null;
        modalCancelHandler = onCancel || null;
    }

    function getWorkspaceRect() {
        return workspace.getBoundingClientRect();
    }

    function getNodeCenter(compId, nodeName) {
        const comp = components.get(compId);
        if (!comp || !comp.el) return null;
        // Nodes are rendered as .node.node-a / .node.node-b
        const node = comp.el.querySelector('.node.node-' + nodeName);
        if (!node) return null;
        const r = workspace.getBoundingClientRect();
        const n = node.getBoundingClientRect();
        return {
            x: n.left - r.left + n.width / 2,
            y: n.top - r.top + n.height / 2
        };
    }

    function formatDisplayValue(type, raw) {
        const s = String(raw || '').trim();
        if (!s) return '';
        const last = s[s.length - 1];
        if ('ΩVAＦFµu'.indexOf(last) !== -1) return s;
        if (type === 'resistor') return s + 'Ω';
        if (type === 'capacitor') return s + 'F';
        if (type === 'vsource') return s + 'V';
        if (type === 'isource') return s + 'A';
        return s;
    }

    function createComponentElement(type, x, y) {
        const id = 'c' + (++componentId);
        const d = defaults[type] || { label: '?', value: '' };
        const el = document.createElement('div');
        el.className = 'comp ' + type;
        el.dataset.compId = id;
        el.style.left = (x - COMP_WIDTH / 2) + 'px';
        el.style.top = (y - COMP_HEIGHT / 2) + 'px';
        const pol =
            (type === 'vsource' || type === 'isource' || type === 'vsource_ac' || type === 'isource_ac')
                ? ('<span class="pol pol-a">+</span><span class="pol pol-b">−</span>')
                : '';

        const displayValue = formatDisplayValue(type, d.value);

        el.innerHTML =
            pol +
            '<span class="node node-a" data-node="a"></span>' +
            '<span class="label">' + d.label + '</span>' +
            '<span class="value">' + displayValue + '</span>' +
            '<span class="node node-b" data-node="b"></span>';
        return { id, type, x, y, el, valueText: d.value, rot: 0, sx: 1, sy: 1 };
    }

    function addComponent(type, x, y) {
        const comp = createComponentElement(type, x, y);
        // Store the SAME object we pass into setup functions so we can hang methods on it.
        components.set(comp.id, comp);
        componentsLayer.appendChild(comp.el);
        setupComponentDrag(comp);
        setupNodeWiring(comp);
        setupComponentEdit(comp);
        return comp.id;
    }

    function setSelected(compId) {
        if (selectedCompId && components.has(selectedCompId)) {
            const prev = components.get(selectedCompId);
            if (prev.el) prev.el.classList.remove('selected');
        }
        selectedCompId = compId;
        if (compId && components.has(compId)) {
            const comp = components.get(compId);
            if (comp.el) comp.el.classList.add('selected');
        }
        // Selecting a component clears any wire selection
        setSelectedWire(null);
    }

    function setSelectedWire(wireId) {
        if (selectedWireId) {
            const prevEl = wireLayer.querySelector('.wire[data-wire-id="' + selectedWireId + '"]');
            if (prevEl) prevEl.classList.remove('wire-selected');
        }
        selectedWireId = wireId;
        if (wireId) {
            const el = wireLayer.querySelector('.wire[data-wire-id="' + wireId + '"]');
            if (el) el.classList.add('wire-selected');
        }
        // Selecting a wire clears component selection
        if (wireId) {
            if (selectedCompId && components.has(selectedCompId)) {
                const prev = components.get(selectedCompId);
                if (prev.el) prev.el.classList.remove('selected');
            }
            selectedCompId = null;
        }
    }

    function clearSelected() {
        setSelected(null);
        setSelectedWire(null);
    }

    function openContextMenu(x, y, compId) {
        ctxMenuFor = compId;
        ctxMenu.style.left = x + 'px';
        ctxMenu.style.top = y + 'px';
        ctxMenu.classList.remove('hidden');
    }

    function closeContextMenu() {
        ctxMenuFor = null;
        ctxMenu.classList.add('hidden');
    }

    function applyTransform(comp) {
        const r = comp.rot || 0;
        const sx = comp.sx || 1;
        const sy = comp.sy || 1;
        comp.el.style.transform = `rotate(${r}deg) scale(${sx}, ${sy})`;
        redrawWires();
    }

    function deleteComponent(compId) {
        const comp = components.get(compId);
        if (!comp) return;
        if (comp.el && comp.el.parentNode) comp.el.parentNode.removeChild(comp.el);
        components.delete(compId);
        // remove wires attached to this component
        [...wires.entries()].forEach(function ([wid, w]) {
            if (w.from.compId === compId || w.to.compId === compId) {
                wires.delete(wid);
            }
        });
        if (selectedCompId === compId) {
            selectedCompId = null;
        }
        redrawWires();
    }

    function deleteWire(wireId) {
        if (!wireId) return;
        wires.delete(wireId);
        setSelectedWire(null);
        redrawWires();
    }

    function setupComponentDrag(comp) {
        const el = comp.el;
        let dx = 0, dy = 0;

        el.addEventListener('mousedown', function (e) {
            if (e.target.classList.contains('node')) return;
            e.preventDefault();
            setSelected(comp.id);
            const r = workspace.getBoundingClientRect();
            dx = e.clientX - (r.left + comp.x);
            dy = e.clientY - (r.top + comp.y);
            el.classList.add('dragging');

            function move(e) {
                const nx = e.clientX - r.left - dx;
                const ny = e.clientY - r.top - dy;
                comp.x = nx;
                comp.y = ny;
                el.style.left = (nx - COMP_WIDTH / 2) + 'px';
                el.style.top = (ny - COMP_HEIGHT / 2) + 'px';
                redrawWires();
            }

            function up() {
                el.classList.remove('dragging');
                document.removeEventListener('mousemove', move);
                document.removeEventListener('mouseup', up);
            }

            document.addEventListener('mousemove', move);
            document.addEventListener('mouseup', up);
        });
    }

    function openMultimeterModal(comp) {
        const reading = lastToolReadings.get(comp.id);
            let mode = comp.toolMode || 'dc-v';

        function renderBody() {
            let main = '';
            if (!reading) {
                main = '<div class="simu-help-note">Run simulation with this multimeter connected to see readings.</div>';
            } else if (mode === 'dc-v') {
                main = `<div>DC V(a,b) = <strong>${reading.dc.Vab.toFixed(6)} V</strong></div>
                        <div class="simu-help-note">Va = ${reading.dc.Va.toFixed(6)} V, Vb = ${reading.dc.Vb.toFixed(6)} V</div>`;
            } else if (mode === 'ac-v') {
                main = `<div>AC |V(a,b)| = <strong>${Math.abs(reading.ac.Vab).toFixed(6)} V</strong> @ ${reading.ac.freqHz} Hz</div>
                        <div class="simu-help-note">|Va| = ${Math.abs(reading.ac.Va).toFixed(6)} V, |Vb| = ${Math.abs(reading.ac.Vb).toFixed(6)} V</div>`;
            } else {
                main = '<div class="simu-help-note">Current measurement not implemented yet (only voltage).</div>';
            }

            return [
                '<div class="simu-chip-row">',
                `<span class="simu-chip ${mode === 'dc-v' ? 'active' : ''}" data-mode="dc-v">DC V</span>`,
                `<span class="simu-chip ${mode === 'ac-v' ? 'active' : ''}" data-mode="ac-v">AC V</span>`,
                `<span class="simu-chip ${mode === 'dc-a' ? 'active' : ''}" data-mode="dc-a">DC A</span>`,
                `<span class="simu-chip ${mode === 'ac-a' ? 'active' : ''}" data-mode="ac-a">AC A</span>`,
                '</div>',
                `<div id="simu-tool-reading" style="margin-top:6px;">${main}</div>`
            ].join('');
        }

        openModal({
            title: `Multimeter ${comp.id}`,
            bodyHTML: renderBody(),
            okText: 'Close',
            showCancel: false
        });

        setTimeout(function () {
            document.querySelectorAll('.simu-chip[data-mode]').forEach(function (chip) {
                chip.addEventListener('click', function () {
                    mode = chip.getAttribute('data-mode') || 'dc-v';
                    comp.toolMode = mode;
                    const body = renderBody();
                    modalBodyEl.innerHTML = body;
                    // rebind chips
                    setTimeout(function () {
                        document.querySelectorAll('.simu-chip[data-mode]').forEach(function (chip2) {
                            chip2.addEventListener('click', function () {
                                mode = chip2.getAttribute('data-mode') || 'dc-v';
                                comp.toolMode = mode;
                                modalBodyEl.innerHTML = renderBody();
                            });
                        });
                    }, 0);
                });
            });
        }, 0);
    }

    function openScopeModal(comp) {
        const reading = lastToolReadings.get(comp.id);
        const dcV = reading ? reading.dc.Vab : 0;
        const acAmp = reading ? Math.abs(reading.ac.Vab) : 0;
        const freqHz = reading ? reading.ac.freqHz : 60;

        const W = 260;
        const H = 80;
        const midY = 40;
        const pad = 6;

        // scale: try to keep wave visible; base it on max(|dc|+acAmp, 1V)
        const maxV = Math.max(Math.abs(dcV) + acAmp, 1);
        const pxPerV = (H / 2 - pad) / maxV;

        function yFor(v) {
            return midY - v * pxPerV;
        }

        // Render 2 cycles
        const cycles = 2;
        const pts = [];
        for (let i = 0; i <= 200; i++) {
            const t = i / 200; // 0..1 across the viewport
            const phase = 2 * Math.PI * cycles * t;
            const v = dcV + acAmp * Math.sin(phase);
            const x = (W * t);
            const y = yFor(v);
            pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
        }

        const trace = pts.join(' ');
        const svg = `
<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#050707" stroke="rgba(255,255,255,0.2)" />
  <line x1="0" y1="${midY}" x2="${W}" y2="${midY}" stroke="rgba(255,255,255,0.2)" stroke-dasharray="4 4" />
  <polyline fill="none" stroke="#00b4ff" stroke-width="2" points="${trace}" />
</svg>`;

        const text = reading
            ? `DC V(a,b) = ${dcV.toFixed(6)} V. AC amplitude |V(a,b)| = ${acAmp.toFixed(6)} V @ ${freqHz} Hz.`
            : 'Run simulation with this scope connected to see a trace.';

        const body = `${svg}<div class="simu-help-note" style="margin-top:6px;">${text}</div>`;

        openModal({
            title: `Scope ${comp.id}`,
            bodyHTML: body,
            okText: 'Close',
            showCancel: false
        });
    }

    function setupComponentEdit(comp) {
        // Tools have custom double-click behavior
        if (comp.type === 'multimeter') {
            comp.el.addEventListener('dblclick', function (e) {
                e.preventDefault();
                e.stopPropagation();
                openMultimeterModal(comp);
            });
        } else if (comp.type === 'scope') {
            comp.el.addEventListener('dblclick', function (e) {
                e.preventDefault();
                e.stopPropagation();
                openScopeModal(comp);
            });
        }

        function edit() {
            if (comp.type === 'ground' || comp.type === 'multimeter' || comp.type === 'scope') return;
            const raw = (comp.valueText != null ? String(comp.valueText) : (comp.el.querySelector('.value')?.textContent || '')).trim();

            const body = [
                '<p>Enter a value for <strong>' + comp.type + '</strong>.</p>',
                '<input id="simu-val-input" class="simu-input" placeholder="e.g. 1k, 10u, 5, 2A" value="' + raw.replace(/"/g, '&quot;') + '">',
                '<div class="simu-chip-row">',
                '<span class="simu-chip" data-insert="k">k (kilo)</span>',
                '<span class="simu-chip" data-insert="M">M (mega)</span>',
                '<span class="simu-chip" data-insert="u">u (micro)</span>',
                '<span class="simu-chip" data-insert="n">n (nano)</span>',
                '<span class="simu-chip" data-insert="p">p (pico)</span>',
                '</div>',
                '<div class="simu-help-note">You can type u for micro (µ). Units are inferred by component type (Ω/F/V/A). Unknown letters (like z) are not allowed.</div>',
                '<div id="simu-val-error" class="simu-error" style="display:none;"></div>'
            ].join('');

            openModal({
                title: 'Edit value',
                bodyHTML: body,
                okText: 'Save',
                cancelText: 'Cancel',
                showCancel: true,
                onOk: function () {
                    const input = document.getElementById('simu-val-input');
                    const errEl = document.getElementById('simu-val-error');
                    if (!input) return;
                    const text = input.value.trim();
                    if (!text) {
                        errEl.textContent = 'Value cannot be empty.';
                        errEl.style.display = '';
                        return false;
                    }
                    const m = text.match(/^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)([a-zA-ZµΩ]*)$/);
                    if (!m) {
                        errEl.textContent = 'Could not parse value. Try forms like 1k, 10u, 5, 2A.';
                        errEl.style.display = '';
                        return false;
                    }
                    const sufRaw = (m[2] || '');
                    const suf = sufRaw.replace('Ω', '').trim();
                    const allowed = new Set(['', 'k', 'K', 'm', 'u', 'µ', 'n', 'p', 'M', 'G', 'V', 'A', 'F']);
                    const first = suf ? suf[0] : '';
                    if (suf && !allowed.has(first) && !allowed.has(suf)) {
                        errEl.textContent = 'Unknown unit "' + sufRaw + '". Allowed: k, M, m, u, n, p, V, A, F.';
                        errEl.style.display = '';
                        return false;
                    }

                    // Looks good; save raw text and update display.
                    comp.valueText = text;
                    const valueEl = comp.el.querySelector('.value');
                    if (valueEl) valueEl.textContent = formatDisplayValue(comp.type, text);
                    return true;
                }
            });

            // Wire up chips + enter key
            setTimeout(function () {
                const input = document.getElementById('simu-val-input');
                if (input) input.focus();
                document.querySelectorAll('.simu-chip').forEach(function (chip) {
                    chip.addEventListener('click', function () {
                        if (!input) return;
                        const ins = chip.getAttribute('data-insert') || '';
                        const start = input.selectionStart || input.value.length;
                        const end = input.selectionEnd || input.value.length;
                        const v = input.value;
                        input.value = v.slice(0, start) + ins + v.slice(end);
                        input.focus();
                        const pos = start + ins.length;
                        input.setSelectionRange(pos, pos);
                    });
                });
                if (input) {
                    input.addEventListener('keydown', function (ev) {
                        if (ev.key === 'Enter') {
                            ev.preventDefault();
                            if (modalOkHandler) {
                                const ok = modalOkHandler();
                                if (ok !== false) closeModal();
                            }
                        }
                    });
                }
            }, 0);
        }

        comp.el.addEventListener('dblclick', function (e) {
            e.preventDefault();
            e.stopPropagation();
            edit();
        });

        comp.el.addEventListener('click', function (e) {
            if (e.target.classList.contains('node')) return;
            setSelected(comp.id);
        });

        comp.el.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            e.stopPropagation();
            setSelected(comp.id);
            openContextMenu(e.clientX, e.clientY, comp.id);
        });

        comp.editValue = edit;
    }

    let tempPath = null;
    let wireStart = null;
    let wireMoveHandler = null;
    let ghostAnchors = [];

    function orthPathD(x1, y1, x2, y2) {
        // Simple L-shape: horizontal then vertical
        const mx = x2;
        const my = y1;
        return `M ${x1} ${y1} L ${mx} ${my} L ${x2} ${y2}`;
    }

    function pathDFromPoints(points) {
        if (!points.length) return '';
        let d = `M ${points[0].x} ${points[0].y}`;
        for (let i = 1; i < points.length; i++) {
            d += ` L ${points[i].x} ${points[i].y}`;
        }
        return d;
    }

    function orthSnap(prev, target) {
        // Snap target so segment prev->snapped is axis-aligned, preferring the dominant axis.
        const dx = target.x - prev.x;
        const dy = target.y - prev.y;
        if (Math.abs(dx) >= Math.abs(dy)) {
            return { x: prev.x + dx, y: prev.y };
        }
        return { x: prev.x, y: prev.y + dy };
    }

    function beginGhostWire(startCenter) {
        tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        ghostAnchors = [startCenter];
        tempPath.setAttribute('d', pathDFromPoints(ghostAnchors));
        tempPath.setAttribute('class', 'wire-temp');
        tempPath.setAttribute('fill', 'none');
        wireLayer.appendChild(tempPath);

        const r = workspace.getBoundingClientRect();
        wireMoveHandler = function (e) {
            let x = e.clientX - r.left;
            let y = e.clientY - r.top;
            if (!tempPath || !wireStart) return;
            const last = ghostAnchors[ghostAnchors.length - 1];
            if (!last) return;
            const dx = x - last.x;
            const dy = y - last.y;
            // Snap so the segment from last -> (x,y) is purely horizontal or vertical
            if (Math.abs(dx) >= Math.abs(dy)) {
                y = last.y;
            } else {
                x = last.x;
            }
            const pts = ghostAnchors.concat([{ x, y }]);
            tempPath.setAttribute('d', pathDFromPoints(pts));
        };
        document.addEventListener('mousemove', wireMoveHandler);
    }

    function endGhostWire() {
        if (wireMoveHandler) {
            document.removeEventListener('mousemove', wireMoveHandler);
            wireMoveHandler = null;
        }
        if (tempPath && tempPath.parentNode) {
            tempPath.parentNode.removeChild(tempPath);
        }
        tempPath = null;
        ghostAnchors = [];
    }

    function handleNodeClick(compId, nodeName) {
        const center = getNodeCenter(compId, nodeName);
        if (!center) return;

        // Start a new ghost wire
        if (!wireStart) {
            wireStart = { compId, nodeName };
            beginGhostWire(center);
            return;
        }

        // Clicking the same node cancels the ghost wire
        if (wireStart.compId === compId && wireStart.nodeName === nodeName) {
            wireStart = null;
            endGhostWire();
            return;
        }

        // Finish the wire on a second node
        const existing = [...wires.values()].some(function (w) {
            return (w.from.compId === wireStart.compId && w.from.node === wireStart.nodeName && w.to.compId === compId && w.to.node === nodeName) ||
                (w.from.compId === compId && w.from.node === nodeName && w.to.compId === wireStart.compId && w.to.node === wireStart.nodeName);
        });
        if (!existing) {
            // store intermediate pivot points (excluding the starting node)
            const pivots = ghostAnchors.slice(1);
            addWire(wireStart.compId, wireStart.nodeName, compId, nodeName, pivots);
        }
        wireStart = null;
        endGhostWire();
    }

    function setupNodeWiring(comp) {
        ['a', 'b'].forEach(function (nodeName) {
            const node = comp.el.querySelector('.node.node-' + nodeName);
            if (!node) return;
            node.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                handleNodeClick(comp.id, nodeName);
            });
        });
    }

    function findNodeAt(clientX, clientY) {
        const threshold = 20;
        for (const [id, comp] of components) {
            for (const nodeName of ['a', 'b']) {
                const center = getNodeCenter(id, nodeName);
                if (!center) continue;
                const r = workspace.getBoundingClientRect();
                const cx = r.left + center.x;
                const cy = r.top + center.y;
                if (Math.hypot(clientX - cx, clientY - cy) <= threshold) return { compId: id, nodeName };
            }
        }
        return null;
    }

    function addWire(fromComp, fromNode, toComp, toNode, pivots) {
        const id = 'w' + (++wireId);
        wires.set(id, {
            id,
            from: { compId: fromComp, node: fromNode },
            to: { compId: toComp, node: toNode },
            pivots: Array.isArray(pivots) ? pivots.slice() : [],
            el: null
        });
        redrawWires();
    }

    function redrawWires() {
        const existing = wireLayer.querySelectorAll('.wire');
        existing.forEach(function (el) { el.remove(); });

        wires.forEach(function (w) {
            const p1 = getNodeCenter(w.from.compId, w.from.node);
            const p2 = getNodeCenter(w.to.compId, w.to.node);
            if (!p1 || !p2) return;
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const pivots = w.pivots && w.pivots.length ? w.pivots : null;

            if (pivots) {
                // Recompute a Manhattan path from live node positions through stored pivot points.
                const pts = [p1];
                let last = { x: p1.x, y: p1.y };
                pivots.forEach(function (pt) {
                    const snapped = orthSnap(last, pt);
                    pts.push(snapped);
                    last = snapped;
                });
                // Final leg to p2: introduce an orthogonal corner then endpoint
                const mid = orthSnap(last, p2);
                if (mid.x !== last.x || mid.y !== last.y) {
                    pts.push(mid);
                }
                pts.push({ x: p2.x, y: p2.y });
                path.setAttribute('d', pathDFromPoints(pts));
            } else {
                path.setAttribute('d', orthPathD(p1.x, p1.y, p2.x, p2.y));
            }
            path.setAttribute('class', 'wire');
            path.setAttribute('stroke', 'var(--wire-color)');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            path.dataset.wireId = w.id;

            path.addEventListener('click', function (e) {
                e.stopPropagation();
                setSelectedWire(w.id);
            });

            wireLayer.appendChild(path);
        });
    }

    /* Palette drag: drop onto workspace to create component */
    document.querySelectorAll('.palette-item').forEach(function (item) {
        item.addEventListener('dragstart', function (e) {
            e.dataTransfer.setData('text/plain', e.currentTarget.dataset.type);
            e.dataTransfer.effectAllowed = 'copy';
        });
    });

    workspace.addEventListener('dragover', function (e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    });

    workspace.addEventListener('drop', function (e) {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        if (!type || !defaults[type]) return;
        const r = workspace.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        addComponent(type, x, y);
    });

    /* Clear */
    document.getElementById('btn-clear').addEventListener('click', function () {
        openModal({
            title: 'Clear all components?',
            bodyHTML: '<p>This will remove all components and wires from the canvas.</p><p class="simu-help-note">This action cannot be undone.</p>',
            okText: 'Clear all',
            cancelText: 'Cancel',
            showCancel: true,
            onOk: function () {
                components.forEach(function (c) {
                    if (c.el && c.el.parentNode) c.el.parentNode.removeChild(c.el);
                });
                components.clear();
                wires.clear();
                wireLayer.querySelectorAll('.wire').forEach(function (el) { el.remove(); });
                clearSelected();
                closeContextMenu();
            }
        });
    });

    /* Simulation (DC operating point) */
    const resultsEl = document.getElementById('sim-results');
    function setResults(text, isError) {
        if (!resultsEl) return;
        resultsEl.classList.remove('is-empty');
        resultsEl.innerHTML = isError ? `<span class=\"err\">${escapeHtml(text)}</span>` : escapeHtml(text);
        if (!text) resultsEl.classList.add('is-empty');
    }

    function escapeHtml(s) {
        return String(s).replace(/[&<>\"']/g, function (c) {
            return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', '\'': '&#39;' })[c];
        });
    }

    function parseNumberWithSuffix(s) {
        const raw = String(s || '').trim();
        if (!raw) return NaN;
        const m = raw.match(/^([+-]?\d*\.?\d+(?:e[+-]?\d+)?)([a-zA-ZµΩ]*)$/);
        if (!m) return NaN;
        const base = parseFloat(m[1]);
        const suf = (m[2] || '').replace('Ω', '').trim();
        const map = {
            k: 1e3, K: 1e3,
            m: 1e-3,
            u: 1e-6, µ: 1e-6,
            n: 1e-9,
            p: 1e-12,
            M: 1e6,
            G: 1e9,
            V: 1, A: 1, F: 1
        };
        if (!suf) return base;
        // allow combos like kΩ, uF, mA, etc. take first char as scale if present
        const first = suf[0];
        const mult = map[first] ?? 1;
        return base * mult;
    }

    function parseAcSpec(text) {
        // amplitude@freqHz, e.g. "5@60", "2.5@1000", "1k@50"
        const raw = String(text || '').trim();
        const parts = raw.split('@').map(s => s.trim()).filter(Boolean);
        if (parts.length === 0) return { amp: NaN, freq: NaN };
        const amp = parseNumberWithSuffix(parts[0]);
        const freq = parts.length >= 2 ? parseNumberWithSuffix(parts[1]) : 60;
        return { amp, freq };
    }

    function unionFind(items) {
        const parent = new Map(items.map(i => [i, i]));
        function find(x) {
            let p = parent.get(x);
            if (p === x) return x;
            p = find(p);
            parent.set(x, p);
            return p;
        }
        function union(a, b) {
            const ra = find(a), rb = find(b);
            if (ra !== rb) parent.set(ra, rb);
        }
        return { parent, find, union };
    }

    function buildNets() {
        // terminals: compId:a and compId:b (ground only uses a)
        const terminals = [];
        components.forEach(function (c, id) {
            terminals.push(id + ':a');
            if (c.type !== 'ground') terminals.push(id + ':b');
        });
        const uf = unionFind(terminals);
        wires.forEach(function (w) {
            uf.union(w.from.compId + ':' + w.from.node, w.to.compId + ':' + w.to.node);
        });

        const netByTerm = new Map();
        const nets = new Map(); // root -> set(terms)
        terminals.forEach(function (t) {
            const r = uf.find(t);
            netByTerm.set(t, r);
            if (!nets.has(r)) nets.set(r, new Set());
            nets.get(r).add(t);
        });

        // ground net(s): any net containing a ground terminal
        const groundRoots = new Set();
        components.forEach(function (c, id) {
            if (c.type === 'ground') {
                groundRoots.add(netByTerm.get(id + ':a'));
            }
        });
        return { netByTerm, nets, groundRoots };
    }

    function solveLinear(A, z) {
        // Gaussian elimination with partial pivoting
        const n = A.length;
        const M = A.map((row, i) => row.slice().concat([z[i]]));
        for (let col = 0; col < n; col++) {
            // pivot
            let piv = col;
            for (let r = col + 1; r < n; r++) {
                if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
            }
            if (Math.abs(M[piv][col]) < 1e-12) throw new Error('Singular matrix (floating nodes?)');
            if (piv !== col) {
                const tmp = M[piv]; M[piv] = M[col]; M[col] = tmp;
            }
            // normalize
            const div = M[col][col];
            for (let c = col; c <= n; c++) M[col][c] /= div;
            // eliminate
            for (let r = 0; r < n; r++) {
                if (r === col) continue;
                const f = M[r][col];
                if (Math.abs(f) < 1e-14) continue;
                for (let c = col; c <= n; c++) M[r][c] -= f * M[col][c];
            }
        }
        return M.map(row => row[n]);
    }

    function solveResistiveMna(opts) {
        const { includeDcSources, includeAcSources } = opts || {};
        const { netByTerm, nets, groundRoots } = buildNets();
        if (nets.size === 0) {
            throw new Error('No components.');
        }
        if (groundRoots.size === 0) {
            throw new Error('Add at least one Ground (GND) component and connect it to your circuit.');
        }

        // Map non-ground nets to node indices (exclude any net that is a ground root)
        const nodeRoots = [...nets.keys()].filter(r => !groundRoots.has(r));
        const nodeIndex = new Map(nodeRoots.map((r, i) => [r, i]));

        // Voltage sources add extra variables
        const vsrcs = [];
        components.forEach(function (c, id) {
            if (c.type === 'vsource' && includeDcSources) vsrcs.push(id);
            if (c.type === 'vsource_ac' && includeAcSources) vsrcs.push(id);
        });

        const N = nodeRoots.length;
        const M = vsrcs.length;
        const dim = N + M;
        if (dim === 0) {
            // No unknowns: everything is ground
            return {
                netByTerm,
                groundRoots,
                nodeIndex,
                nodeRoots,
                vsrcs,
                vsrcCurrents: [],
                nodeVoltages: [],
                netVoltage: function () { return 0; }
            };
        }

        const A = Array.from({ length: dim }, () => Array(dim).fill(0));
        const z = Array(dim).fill(0);

        function nIdx(term) {
            const root = netByTerm.get(term);
            if (!root || groundRoots.has(root)) return -1;
            return nodeIndex.get(root);
        }

        // Stamp resistors + current sources + (capacitors ignored, tools ignored)
        components.forEach(function (c, id) {
            const a = nIdx(id + ':a');
            const b = (c.type === 'ground') ? -1 : nIdx(id + ':b');

            if (c.type === 'resistor') {
                const R = parseNumberWithSuffix(c.valueText || c.el.querySelector('.value')?.textContent);
                if (!isFinite(R) || R === 0) throw new Error(`Bad resistor value on ${id} (use e.g. 1k)`);
                const g = 1 / R;
                if (a >= 0) A[a][a] += g;
                if (b >= 0) A[b][b] += g;
                if (a >= 0 && b >= 0) { A[a][b] -= g; A[b][a] -= g; }
            } else if (c.type === 'isource' && includeDcSources) {
                const I = parseNumberWithSuffix(c.valueText || c.el.querySelector('.value')?.textContent);
                if (!isFinite(I)) throw new Error(`Bad current source value on ${id} (use e.g. 2A)`);
                // current from a(+) to b(-): inject -I into a, +I into b
                if (a >= 0) z[a] += (-I);
                if (b >= 0) z[b] += (+I);
            } else if (c.type === 'isource_ac' && includeAcSources) {
                const spec = parseAcSpec(c.valueText || c.el.querySelector('.value')?.textContent);
                if (!isFinite(spec.amp)) throw new Error(`Bad AC current source value on ${id} (use e.g. 1@60)`);
                const I = spec.amp;
                // current from a(+) to b(-): inject -I into a, +I into b
                if (a >= 0) z[a] += (-I);
                if (b >= 0) z[b] += (+I);
            } else if (c.type === 'capacitor') {
                // DC open circuit
            }
        });

        // Stamp voltage sources (MNA)
        vsrcs.forEach(function (id, k) {
            const c = components.get(id);
            const a = nIdx(id + ':a');
            const b = nIdx(id + ':b');
            const row = N + k;
            let V = NaN;
            if (c.type === 'vsource') {
                V = parseNumberWithSuffix(c.valueText || c.el.querySelector('.value')?.textContent);
                if (!isFinite(V)) throw new Error(`Bad voltage source value on ${id} (use e.g. 5)`);
            } else if (c.type === 'vsource_ac') {
                const spec = parseAcSpec(c.valueText || c.el.querySelector('.value')?.textContent);
                V = spec.amp;
                if (!isFinite(V)) throw new Error(`Bad AC voltage source value on ${id} (use e.g. 5@60)`);
            }

            if (a >= 0) { A[a][row] += 1; A[row][a] += 1; }
            if (b >= 0) { A[b][row] -= 1; A[row][b] -= 1; }
            z[row] += V;
        });

        const x = solveLinear(A, z);
        const v = x.slice(0, N);
        const iv = x.slice(N);

        function netVoltage(root) {
            if (!root || groundRoots.has(root)) return 0;
            const idx = nodeIndex.get(root);
            if (idx == null) return 0;
            return v[idx];
        }

        return {
            netByTerm,
            groundRoots,
            nodeIndex,
            nodeRoots,
            vsrcs,
            nodeVoltages: v,
            vsrcCurrents: iv,
            netVoltage
        };
    }

    function runSimulation() {
        // DC solve from DC sources only
        const dc = solveResistiveMna({ includeDcSources: true, includeAcSources: false });
        // AC solve from AC sources only (amplitude), purely resistive => same phase everywhere
        const ac = solveResistiveMna({ includeDcSources: false, includeAcSources: true });

        // Determine a single frequency for display (take first AC source, default 60)
        let freqHz = 60;
        components.forEach(function (c) {
            if (c.type === 'vsource_ac' || c.type === 'isource_ac') {
                const spec = parseAcSpec(c.valueText || c.el.querySelector('.value')?.textContent);
                if (isFinite(spec.freq)) freqHz = spec.freq;
            }
        });

        const toolReadings = new Map();
        const tools = [];
        components.forEach(function (c, id) {
            if (c.type !== 'multimeter' && c.type !== 'scope') return;
            const ra = dc.netByTerm.get(id + ':a');
            const rb = dc.netByTerm.get(id + ':b');
            const dcVa = dc.netVoltage(ra);
            const dcVb = dc.netVoltage(rb);
            const dcVab = dcVa - dcVb;

            const acVa = ac.netVoltage(ra);
            const acVb = ac.netVoltage(rb);
            const acVab = acVa - acVb; // amplitude

            const reading = {
                id,
                type: c.type,
                dc: { Va: dcVa, Vb: dcVb, Vab: dcVab },
                ac: { Va: acVa, Vb: acVb, Vab: acVab, freqHz }
            };
            tools.push(reading);
            toolReadings.set(id, reading);
        });

        lastToolReadings = toolReadings;

        if (!tools.length) {
            setResults('Simulation complete, but no tools placed. Drag a Multimeter or Scope from the Tools panel, connect it, then run again.', false);
            return;
        }

        let out = 'Tool Readings\\n';
        out += '------------\\n';
        tools.forEach(function (t) {
            const label = t.type === 'multimeter' ? 'Multimeter' : 'Scope';
            out += `- ${label} ${t.id}: DC V(a,b)=${t.dc.Vab.toFixed(6)} V, AC |V(a,b)|=${Math.abs(t.ac.Vab).toFixed(6)} V @ ${t.ac.freqHz} Hz\\n`;
        });
        out += '\\nNotes: GND symbols are treated as 0V. Capacitors are open in DC.';
        setResults(out, false);
    }

    if (resultsEl) resultsEl.classList.add('is-empty');
    setResults('Drop parts, connect wires, add GND, then click “Run simulation”.', false);
    document.getElementById('btn-run').addEventListener('click', function () {
        try {
            runSimulation();
        } catch (e) {
            setResults(String(e && e.message ? e.message : e), true);
        }
    });

    // Help / keybinds modal
    document.getElementById('btn-help').addEventListener('click', function () {
        const body = [
            '<p><strong>Keybinds</strong></p>',
            '<ul>',
            '<li>Click node → start/finish wire</li>',
            '<li>Click empty workspace while drawing → add 90° pivot</li>',
            '<li>Click component body → select</li>',
            '<li>Delete / Backspace → delete selected component</li>',
            '<li>Right-click component → context menu (Edit, Delete, Rotate, Flip)</li>',
            '<li>Ctrl+R (Cmd+R on Mac) → rotate selected 90° clockwise</li>',
            '<li>Double-click component → edit value</li>',
            '</ul>',
            '<p class="simu-help-note">Values: use k, M, m, u, n, p. Example: 1k, 10u, 5, 2A. u is treated as micro (µ).</p>'
        ].join('');
        openModal({
            title: 'Simucircuit keybinds & tips',
            bodyHTML: body,
            okText: 'Close',
            showCancel: false
        });
    });

    // Modal OK / Cancel wiring
    if (modalOkEl) {
        modalOkEl.addEventListener('click', function () {
            if (modalOkHandler) {
                const keep = modalOkHandler();
                if (keep === false) return;
            }
            closeModal();
        });
    }
    if (modalCancelEl) {
        modalCancelEl.addEventListener('click', function () {
            if (modalCancelHandler) {
                modalCancelHandler();
            }
            closeModal();
        });
    }

    if (overlayEl) {
        overlayEl.addEventListener('click', function () {
            if (modalCancelHandler) modalCancelHandler();
            closeModal();
        });
    }

    // Global handlers: context menu actions, delete key, rotate shortcut, pivot clicks
    ctxMenu.addEventListener('click', function (e) {
        const item = e.target.closest('.ctx-menu-item');
        if (!item) return;
        const action = item.dataset.action;
        const id = ctxMenuFor;
        closeContextMenu();
        if (!id || !components.has(id)) return;
        const comp = components.get(id);
        if (action === 'edit' && comp.editValue) {
            comp.editValue();
        } else if (action === 'delete') {
            deleteComponent(id);
        } else if (action === 'rot-cw') {
            comp.rot = ((comp.rot || 0) + 90) % 360;
            applyTransform(comp);
        } else if (action === 'rot-ccw') {
            comp.rot = ((comp.rot || 0) + 270) % 360;
            applyTransform(comp);
        } else if (action === 'flip-h') {
            comp.sx = (comp.sx || 1) * -1;
            applyTransform(comp);
        } else if (action === 'flip-v') {
            comp.sy = (comp.sy || 1) * -1;
            applyTransform(comp);
        }
    });

    document.addEventListener('click', function (e) {
        if (!ctxMenu.contains(e.target)) {
            closeContextMenu();
        }
    });

    document.addEventListener('keydown', function (e) {
        const tag = e.target.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        if (e.key === 'Escape') {
            // If a modal is open, close it
            if (modalEl && !modalEl.classList.contains('hidden')) {
                if (modalCancelHandler) modalCancelHandler();
                closeModal();
                return;
            }
            // Cancel wire drawing
            if (wireStart || tempPath) {
                wireStart = null;
                endGhostWire();
                return;
            }
            // Clear selection
            clearSelected();
            closeContextMenu();
        } else if ((e.key === 'Delete' || e.key === 'Backspace')) {
            if (selectedCompId) {
                e.preventDefault();
                deleteComponent(selectedCompId);
            } else if (selectedWireId) {
                e.preventDefault();
                deleteWire(selectedWireId);
            }
        } else if ((e.key === 'r' || e.key === 'R') && (e.ctrlKey || e.metaKey) && selectedCompId && components.has(selectedCompId)) {
            e.preventDefault();
            const comp = components.get(selectedCompId);
            comp.rot = ((comp.rot || 0) + 90) % 360;
            applyTransform(comp);
        }
    });

    // Workspace click to add wire pivot when drawing
    workspace.addEventListener('click', function (e) {
        if (!wireStart || !tempPath) {
            // Not drawing a wire: clicking empty workspace clears selection
            if (e.target === workspace) {
                clearSelected();
                closeContextMenu();
            }
            return;
        }
        if (e.target !== workspace) return;
        const r = workspace.getBoundingClientRect();
        let x = e.clientX - r.left;
        let y = e.clientY - r.top;
        const last = ghostAnchors[ghostAnchors.length - 1];
        if (!last) return;
        const dx = x - last.x;
        const dy = y - last.y;
        if (Math.abs(dx) >= Math.abs(dy)) {
            y = last.y;
        } else {
            x = last.x;
        }
        ghostAnchors.push({ x, y });
        const pts = ghostAnchors.slice();
        tempPath.setAttribute('d', pathDFromPoints(pts));
    });
})();
