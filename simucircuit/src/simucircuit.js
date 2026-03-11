(function () {
    'use strict';

    const COMP_WIDTH = 80;
    const COMP_HEIGHT = 44;
    const NODE_R = 6;

    const defaults = {
        resistor: { label: 'R', value: '1kΩ' },
        capacitor: { label: 'C', value: '1µF' },
        vsource: { label: 'V', value: '5V' },
        isource: { label: 'I', value: '1A' }
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
        const node = comp.el.querySelector('.node.' + nodeName);
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
        el.innerHTML =
            '<span class="node node-a" data-node="a"></span>' +
            '<span class="label">' + d.label + '</span>' +
            '<span class="value">' + d.value + '</span>' +
            '<span class="node node-b" data-node="b"></span>';
        return { id, type, x, y, el };
    }

    function addComponent(type, x, y) {
        const comp = createComponentElement(type, x, y);
        components.set(comp.id, { ...comp, x, y });
        componentsLayer.appendChild(comp.el);
        setupComponentDrag(comp);
        setupNodeWiring(comp);
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

    function setupNodeWiring(comp) {
        ['a', 'b'].forEach(function (nodeName) {
            const node = comp.el.querySelector('.node.node-' + nodeName);
            if (!node) return;
            node.addEventListener('mousedown', function (e) {
                e.preventDefault();
                e.stopPropagation();
                startWire(comp.id, nodeName, e);
            });
        });
    }

    let tempLine = null;
    let wireStart = null;

    function startWire(compId, nodeName, e) {
        const r = workspace.getBoundingClientRect();
        const start = getNodeCenter(compId, nodeName);
        if (!start) return;
        wireStart = { compId, nodeName };
        tempLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        tempLine.setAttribute('x1', start.x);
        tempLine.setAttribute('y1', start.y);
        tempLine.setAttribute('x2', start.x);
        tempLine.setAttribute('y2', start.y);
        tempLine.setAttribute('class', 'wire-temp');
        wireLayer.appendChild(tempLine);

        function move(e) {
            const x = e.clientX - r.left;
            const y = e.clientY - r.top;
            tempLine.setAttribute('x2', x);
            tempLine.setAttribute('y2', y);
        }

        function up(e) {
            document.removeEventListener('mousemove', move);
            document.removeEventListener('mouseup', up);
            if (tempLine && tempLine.parentNode) tempLine.parentNode.removeChild(tempLine);
            tempLine = null;

            const target = findNodeAt(e.clientX, e.clientY);
            if (target && (target.compId !== wireStart.compId || target.nodeName !== wireStart.nodeName)) {
                const existing = [...wires.values()].some(function (w) {
                    return (w.from.compId === wireStart.compId && w.from.node === wireStart.nodeName && w.to.compId === target.compId && w.to.node === target.nodeName) ||
                        (w.from.compId === target.compId && w.from.node === target.nodeName && w.to.compId === wireStart.compId && w.to.node === wireStart.nodeName);
                });
                if (!existing) {
                    addWire(wireStart.compId, wireStart.nodeName, target.compId, target.nodeName);
                }
            }
            wireStart = null;
        }

        document.addEventListener('mousemove', move);
        document.addEventListener('mouseup', up);
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
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', p1.x);
            line.setAttribute('y1', p1.y);
            line.setAttribute('x2', p2.x);
            line.setAttribute('y2', p2.y);
            line.setAttribute('class', 'wire');
            line.setAttribute('stroke', 'var(--wire-color)');
            line.setAttribute('stroke-width', '2');
            wireLayer.appendChild(line);
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
})();
