/**
 * 3D Minesweeper - Three.js
 * Grid: 5x5x5, face-adjacent neighbors (6), mines placed after first click.
 */

(function () {
    'use strict';

    const SIZE = 5;           // 5x5x5 grid
    const MINE_COUNT = 10;    // number of mines
    const CELL_SCALE = 0.92;  // gap between cubes
    const COLORS = {
        hidden: 0x1a3a4a,
        revealed: 0x0d1f2d,
        flag: 0xff4444,
        mine: 0x333333,
        mineHit: 0xaa0000,
        num: [null, 0x00bfff, 0x00cc66, 0xff6600, 0xcc00cc, 0xcc0000, 0x00cccc]
    };

    let scene, camera, renderer, raycaster, mouse;
    let grid = [];             // 3D array of cell state
    let cellMeshes = [];       // 3D array of Three.js mesh (box)
    let numberMeshes = [];     // flat list of text/number sprites or meshes for cleanup
    let gameStarted = false;
    let gameOver = false;
    let firstClick = true;
    let flagsPlaced = 0;
    let timerInterval = null;
    let seconds = 0;
    let isDragging = false;
    let prevMouseX = 0, prevMouseY = 0;
    let cameraAngleX = 0.6, cameraAngleY = 0.8;
    let cameraDistance = 12;
    let container;

    function init() {
        container = document.getElementById('canvasContainer');
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0a0a12);

        camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
        updateCameraPosition();

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();

        // Lights
        const ambient = new THREE.AmbientLight(0x404060);
        scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 0.9);
        dir.position.set(5, 8, 5);
        scene.add(dir);
        const back = new THREE.DirectionalLight(0x334466, 0.4);
        back.position.set(-5, 3, -5);
        scene.add(back);

        buildGrid();
        bindEvents();
        updateHUD();
        animate();
    }

    function buildGrid() {
        // Clear previous
        cellMeshes.forEach(function (plane) {
            plane.forEach(function (row) {
                row.forEach(function (mesh) {
                    if (mesh && mesh.geometry) mesh.geometry.dispose();
                    if (mesh && mesh.material) mesh.material.dispose();
                    if (mesh) scene.remove(mesh);
                });
            });
        });
        numberMeshes.forEach(function (entry) {
            const m = entry.mesh || entry;
            if (m.geometry) m.geometry.dispose();
            if (m.material) m.material.dispose();
            scene.remove(m);
        });
        numberMeshes = [];

        grid = [];
        cellMeshes = [];
        const geometry = new THREE.BoxGeometry(CELL_SCALE, CELL_SCALE, CELL_SCALE);

        for (let x = 0; x < SIZE; x++) {
            grid[x] = [];
            cellMeshes[x] = [];
            for (let y = 0; y < SIZE; y++) {
                grid[x][y] = [];
                cellMeshes[x][y] = [];
                for (let z = 0; z < SIZE; z++) {
                    grid[x][y][z] = {
                        hasMine: false,
                        revealed: false,
                        flagged: false,
                        adjacent: 0
                    };
                    const mat = new THREE.MeshPhongMaterial({
                        color: COLORS.hidden,
                        shininess: 30,
                        emissive: 0x0a1520
                    });
                    const mesh = new THREE.Mesh(geometry.clone(), mat);
                    mesh.position.set(
                        x - (SIZE - 1) / 2,
                        y - (SIZE - 1) / 2,
                        z - (SIZE - 1) / 2
                    );
                    mesh.userData = { x, y, z };
                    scene.add(mesh);
                    cellMeshes[x][y][z] = mesh;
                }
            }
        }
    }

    function placeMines(excludeX, excludeY, excludeZ) {
        const list = [];
        for (let x = 0; x < SIZE; x++)
            for (let y = 0; y < SIZE; y++)
                for (let z = 0; z < SIZE; z++)
                    if (x !== excludeX || y !== excludeY || z !== excludeZ)
                        list.push({ x, y, z });

        for (let i = 0; i < MINE_COUNT && list.length > 0; i++) {
            const idx = Math.floor(Math.random() * list.length);
            const c = list[idx];
            list.splice(idx, 1);
            grid[c.x][c.y][c.z].hasMine = true;
        }

        for (let x = 0; x < SIZE; x++)
            for (let y = 0; y < SIZE; y++)
                for (let z = 0; z < SIZE; z++)
                    grid[x][y][z].adjacent = countAdjacentMines(x, y, z);
    }

    function countAdjacentMines(x, y, z) {
        let n = 0;
        for (let dx = -1; dx <= 1; dx++)
            for (let dy = -1; dy <= 1; dy++)
                for (let dz = -1; dz <= 1; dz++) {
                    if (dx === 0 && dy === 0 && dz === 0) continue;
                    const nx = x + dx, ny = y + dy, nz = z + dz;
                    if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && nz >= 0 && nz < SIZE)
                        if (grid[nx][ny][nz].hasMine) n++;
                }
        return n;
    }

    function getCellUnderMouse() {
        raycaster.setFromCamera(mouse, camera);
        const all = [];
        for (let x = 0; x < SIZE; x++)
            for (let y = 0; y < SIZE; y++)
                for (let z = 0; z < SIZE; z++)
                    if (!grid[x][y][z].revealed)
                        all.push(cellMeshes[x][y][z]);
        const hits = raycaster.intersectObjects(all);
        if (hits.length > 0) return hits[0].object.userData;
        return null;
    }

    function revealCell(x, y, z) {
        const c = grid[x][y][z];
        if (c.revealed || c.flagged || gameOver) return;

        if (firstClick) {
            firstClick = false;
            placeMines(x, y, z);
            startTimer();
        }

        if (c.hasMine) {
            endGame(false);
            revealAllMines();
            setCellMaterial(x, y, z, COLORS.mineHit);
            return;
        }

        c.revealed = true;

        if (c.adjacent === 0) {
            cellMeshes[x][y][z].visible = false;
            for (let dx = -1; dx <= 1; dx++)
                for (let dy = -1; dy <= 1; dy++)
                    for (let dz = -1; dz <= 1; dz++) {
                        if (dx === 0 && dy === 0 && dz === 0) continue;
                        const nx = x + dx, ny = y + dy, nz = z + dz;
                        if (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && nz >= 0 && nz < SIZE)
                            revealCell(nx, ny, nz);
                    }
        } else {
            cellMeshes[x][y][z].visible = false;
            addNumberLabel(x, y, z, c.adjacent);
        }

        if (checkWin()) endGame(true);
    }

    function addNumberLabel(x, y, z, num) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const size = 64;
        canvas.width = size;
        canvas.height = size;
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, size, size);
        ctx.font = 'bold 48px JetBrains Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const color = COLORS.num[Math.min(num, 6)] !== undefined ? COLORS.num[Math.min(num, 6)] : 0xffffff;
        ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
        ctx.fillText(String(num), size / 2, size / 2);

        const tex = new THREE.CanvasTexture(canvas);
        tex.needsUpdate = true;
        const mat = new THREE.MeshBasicMaterial({
            map: tex,
            transparent: true,
            side: THREE.DoubleSide,
            depthWrite: false
        });
        const geo = new THREE.PlaneGeometry(0.6, 0.6);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(
            x - (SIZE - 1) / 2,
            y - (SIZE - 1) / 2,
            z - (SIZE - 1) / 2
        );
        scene.add(mesh);
        numberMeshes.push({ mesh: mesh, type: 'number' });
    }

    function setCellMaterial(x, y, z, color) {
        const mesh = cellMeshes[x][y][z];
        if (mesh.material) mesh.material.dispose();
        mesh.material = new THREE.MeshPhongMaterial({
            color: color,
            shininess: 30,
            emissive: 0x0a1520
        });
    }

    function toggleFlag(x, y, z) {
        const c = grid[x][y][z];
        if (c.revealed || gameOver) return;
        c.flagged = !c.flagged;
        flagsPlaced += c.flagged ? 1 : -1;
        setCellMaterial(x, y, z, c.flagged ? COLORS.flag : COLORS.hidden);
        updateHUD();
    }

    function revealAllMines() {
        for (let x = 0; x < SIZE; x++)
            for (let y = 0; y < SIZE; y++)
                for (let z = 0; z < SIZE; z++)
                    if (grid[x][y][z].hasMine && !grid[x][y][z].flagged)
                        setCellMaterial(x, y, z, COLORS.mine);
    }

    function checkWin() {
        let revealed = 0;
        for (let x = 0; x < SIZE; x++)
            for (let y = 0; y < SIZE; y++)
                for (let z = 0; z < SIZE; z++)
                    if (grid[x][y][z].revealed) revealed++;
        const total = SIZE * SIZE * SIZE;
        return revealed === total - MINE_COUNT;
    }

    function startTimer() {
        if (timerInterval) return;
        seconds = 0;
        timerInterval = setInterval(function () {
            seconds++;
            document.getElementById('timer').textContent = seconds;
        }, 1000);
    }

    function stopTimer() {
        if (timerInterval) {
            clearInterval(timerInterval);
            timerInterval = null;
        }
    }

    function endGame(won) {
        gameOver = true;
        stopTimer();
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const msg = document.getElementById('gameOverMessage');
        const content = modal.querySelector('.game-modal-content');
        modal.classList.add('show');
        content.classList.remove('win');
        if (won) {
            title.textContent = 'You Win!';
            msg.textContent = 'Time: ' + seconds + 's';
            content.classList.add('win');
        } else {
            title.textContent = 'Game Over';
            msg.textContent = 'You hit a mine!';
        }
    }

    function updateCameraPosition() {
        const r = cameraDistance;
        camera.position.x = r * Math.sin(cameraAngleY) * Math.cos(cameraAngleX);
        camera.position.y = r * Math.sin(cameraAngleX);
        camera.position.z = r * Math.cos(cameraAngleY) * Math.cos(cameraAngleX);
        camera.lookAt(0, 0, 0);
        camera.updateMatrixWorld(true);
    }

    function updateHUD() {
        const minesEl = document.getElementById('minesCount');
        const flagsEl = document.getElementById('flagsCount');
        if (minesEl) minesEl.textContent = MINE_COUNT;
        if (flagsEl) flagsEl.textContent = flagsPlaced;
    }

    function bindEvents() {
        window.addEventListener('resize', onResize);

        renderer.domElement.addEventListener('pointermove', function (e) {
            const rect = renderer.domElement.getBoundingClientRect();
            mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            if (isDragging) {
                cameraAngleY += (e.clientX - prevMouseX) * 0.01;
                cameraAngleX += (e.clientY - prevMouseY) * 0.01;
                cameraAngleX = Math.max(-1.2, Math.min(1.2, cameraAngleX));
                prevMouseX = e.clientX;
                prevMouseY = e.clientY;
                updateCameraPosition();
            }
        });

        renderer.domElement.addEventListener('pointerdown', function (e) {
            if (e.button === 0) {
                isDragging = true;
                prevMouseX = e.clientX;
                prevMouseY = e.clientY;
            }
        });

        renderer.domElement.addEventListener('pointerup', function (e) {
            if (e.button === 0) {
                if (isDragging) {
                    const dx = e.clientX - prevMouseX;
                    const dy = e.clientY - prevMouseY;
                    if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
                        const cell = getCellUnderMouse();
                        if (cell) revealCell(cell.x, cell.y, cell.z);
                    }
                }
                isDragging = false;
            } else if (e.button === 2) {
                const cell = getCellUnderMouse();
                if (cell) toggleFlag(cell.x, cell.y, cell.z);
            }
        });

        renderer.domElement.addEventListener('contextmenu', function (e) {
            e.preventDefault();
        });

        document.getElementById('newGameBtn').addEventListener('click', resetGame);
        document.getElementById('playAgainBtn').addEventListener('click', function () {
            document.getElementById('gameOverModal').classList.remove('show');
            resetGame();
        });
    }

    function onResize() {
        if (!container) return;
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function resetGame() {
        stopTimer();
        gameStarted = false;
        gameOver = false;
        firstClick = true;
        flagsPlaced = 0;
        document.getElementById('timer').textContent = '0';
        buildGrid();
        updateHUD();
    }

    function animate() {
        requestAnimationFrame(animate);
        numberMeshes.forEach(function (entry) {
            if (entry.mesh && entry.mesh.lookAt) entry.mesh.lookAt(camera.position);
        });
        renderer.render(scene, camera);
    }

    init();
})();
