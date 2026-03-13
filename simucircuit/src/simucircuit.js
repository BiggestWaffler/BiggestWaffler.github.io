(function () {
    'use strict';

    const COMP_WIDTH = 80;
    const COMP_HEIGHT = 44;
    const NODE_R = 6;

    const defaults = {
        resistor: { label: 'R', value: '1kΩ' },
        capacitor: { label: 'C', value: '1µF' },
        vsource: { label: 'V', value: '5V' },
        isource: { label: 'I', value: '1A' },
        ground: { label: 'GND', value: '' }
    };

    let componentId = 0;
    let wireId = 0;
    const components = new Map();
    const wires = new Map();

    const workspace = document.getElementById('workspace');
    const wireLayer = document.getElementById('wire-layer');
    const componentsLayer = document.getElementById('components-layer');

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

    function createComponentElement(type, x, y) {
        const id = 'c' + (++componentId);
        const d = defaults[type] || { label: '?', value: '' };
        const el = document.createElement('div');
        el.className = 'comp ' + type;
        el.dataset.compId = id;
        el.style.left = (x - COMP_WIDTH / 2) + 'px';
        el.style.top = (y - COMP_HEIGHT / 2) + 'px';
        const pol =
            (type === 'vsource' || type === 'isource')
                ? ('<span class="pol pol-a">+</span><span class="pol pol-b">−</span>')
                : '';

        el.innerHTML =
            pol +
            '<span class="node node-a" data-node="a"></span>' +
            '<span class="label">' + d.label + '</span>' +
            '<span class="value">' + d.value + '</span>' +
            '<span class="node node-b" data-node="b"></span>';
        return { id, type, x, y, el, valueText: d.value };
    }

    function addComponent(type, x, y) {
        const comp = createComponentElement(type, x, y);
        components.set(comp.id, { ...comp, x, y });
        componentsLayer.appendChild(comp.el);
        setupComponentDrag(comp);
        setupNodeWiring(comp);
        setupComponentEdit(comp);
        return comp.id;
    }

    function setupComponentDrag(comp) {
        const el = comp.el;
        let dx = 0, dy = 0;

        el.addEventListener('mousedown', function (e) {
            if (e.target.classList.contains('node')) return;
            e.preventDefault();
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

    function setupComponentEdit(comp) {
        comp.el.addEventListener('dblclick', function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (comp.type === 'ground') return;
            const current = comp.el.querySelector('.value')?.textContent || '';
            const next = prompt('Set value (examples: 1k, 10u, 5V, 2A)', current);
            if (next == null) return;
            const v = next.trim();
            comp.valueText = v;
            const valueEl = comp.el.querySelector('.value');
            if (valueEl) valueEl.textContent = v;
        });
    }

    let tempPath = null;
    let wireStart = null;
    let wireMoveHandler = null;

    function orthPathD(x1, y1, x2, y2) {
        // Simple L-shape: horizontal then vertical
        const mx = x2;
        const my = y1;
        return `M ${x1} ${y1} L ${mx} ${my} L ${x2} ${y2}`;
    }

    function beginGhostWire(startCenter) {
        tempPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        tempPath.setAttribute('d', orthPathD(startCenter.x, startCenter.y, startCenter.x, startCenter.y));
        tempPath.setAttribute('class', 'wire-temp');
        tempPath.setAttribute('fill', 'none');
        wireLayer.appendChild(tempPath);

        const r = workspace.getBoundingClientRect();
        wireMoveHandler = function (e) {
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            if (!tempPath || !wireStart) return;
            const start = getNodeCenter(wireStart.compId, wireStart.nodeName);
            if (!start) return;
            tempPath.setAttribute('d', orthPathD(start.x, start.y, x, y));
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
            addWire(wireStart.compId, wireStart.nodeName, compId, nodeName);
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

    function addWire(fromComp, fromNode, toComp, toNode) {
        const id = 'w' + (++wireId);
        wires.set(id, { id, from: { compId: fromComp, node: fromNode }, to: { compId: toComp, node: toNode }, el: null });
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
            path.setAttribute('d', orthPathD(p1.x, p1.y, p2.x, p2.y));
            path.setAttribute('class', 'wire');
            path.setAttribute('stroke', 'var(--wire-color)');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
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
        components.forEach(function (c) {
            if (c.el && c.el.parentNode) c.el.parentNode.removeChild(c.el);
        });
        components.clear();
        wires.clear();
        wireLayer.querySelectorAll('.wire').forEach(function (el) { el.remove(); });
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

    function runDcSim() {
        const { netByTerm, nets, groundRoots } = buildNets();
        if (nets.size === 0) {
            setResults('No components.', true);
            return;
        }
        if (groundRoots.size === 0) {
            setResults('Add a Ground (GND) component and connect it to your circuit.', true);
            return;
        }
        if (groundRoots.size > 1) {
            setResults('Multiple separate grounds detected. Connect all grounds together (one reference node).', true);
            return;
        }
        const gndRoot = [...groundRoots][0];

        // Map non-ground nets to node indices
        const nodeRoots = [...nets.keys()].filter(r => r !== gndRoot);
        const nodeIndex = new Map(nodeRoots.map((r, i) => [r, i]));

        // Voltage sources add extra variables
        const vsrcs = [];
        components.forEach(function (c, id) {
            if (c.type === 'vsource') vsrcs.push(id);
        });

        const N = nodeRoots.length;
        const M = vsrcs.length;
        const dim = N + M;
        if (dim === 0) {
            setResults('Only ground present.', true);
            return;
        }

        const A = Array.from({ length: dim }, () => Array(dim).fill(0));
        const z = Array(dim).fill(0);

        function nIdx(term) {
            const root = netByTerm.get(term);
            if (!root || root === gndRoot) return -1;
            return nodeIndex.get(root);
        }

        // Stamp resistors + current sources + (capacitors ignored for DC)
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
            } else if (c.type === 'isource') {
                const I = parseNumberWithSuffix(c.valueText || c.el.querySelector('.value')?.textContent);
                if (!isFinite(I)) throw new Error(`Bad current source value on ${id} (use e.g. 2A)`);
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
            const V = parseNumberWithSuffix(c.valueText || c.el.querySelector('.value')?.textContent);
            if (!isFinite(V)) throw new Error(`Bad voltage source value on ${id} (use e.g. 5V)`);

            if (a >= 0) { A[a][row] += 1; A[row][a] += 1; }
            if (b >= 0) { A[b][row] -= 1; A[row][b] -= 1; }
            z[row] += V;
        });

        const x = solveLinear(A, z);
        const v = x.slice(0, N);
        const iv = x.slice(N);

        let out = 'DC Operating Point\\n';
        out += '-----------------\\n';
        out += 'Node voltages (relative to GND):\\n';
        nodeRoots.forEach(function (root, i) {
            out += `- N${i + 1}: ${v[i].toFixed(6)} V\\n`;
        });
        if (M) {
            out += '\\nVoltage source currents:\\n';
            vsrcs.forEach(function (id, i) {
                out += `- ${id}: ${iv[i].toFixed(6)} A\\n`;
            });
        }
        out += '\\nNotes: Capacitors are treated as open (DC).';
        setResults(out, false);
    }

    if (resultsEl) resultsEl.classList.add('is-empty');
    setResults('Drop parts, connect wires, add GND, then click “Run simulation”.', false);
    document.getElementById('btn-run').addEventListener('click', function () {
        try {
            runDcSim();
        } catch (e) {
            setResults(String(e && e.message ? e.message : e), true);
        }
    });
})();
