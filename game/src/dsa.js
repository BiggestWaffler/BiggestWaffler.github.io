class DSAGame {
    constructor() {
        this.currentLevel = null;
        this.gameState = {};
        this.playback = {
            active: false,
            playing: false,
            step: 0,
            maxSteps: 0,
            interval: null,
            sequence: [] // stores state snapshots or action objects
        };
        this.elements = {
            menu: document.getElementById('menu'),
            gameArea: document.getElementById('game-area'),
            canvasWrapper: document.getElementById('canvas-wrapper'),
            levelTitle: document.getElementById('level-title'),
            instructions: document.getElementById('instructions'),
            levelExplanation: document.getElementById('level-explanation'),
            stats: document.getElementById('stats'),
            accuracyDisplay: document.getElementById('accuracy-display'),
            victoryModal: document.getElementById('victory-modal'),
            victoryMessage: document.getElementById('victory-message'),
            victoryStats: document.getElementById('victory-stats'),
            btnShowOptimal: document.getElementById('btn-show-optimal'),
            playbackControls: document.getElementById('playback-controls'),
            playbackStatus: document.getElementById('playback-status'),
            btnPlay: document.getElementById('btn-play')
        };
    }

    startLevel(levelId) {
        this.currentLevel = levelId;
        this.elements.menu.classList.remove('active');
        this.elements.gameArea.classList.add('active');
        this.elements.victoryModal.classList.remove('open');
        this.elements.canvasWrapper.innerHTML = '';
        this.elements.accuracyDisplay.style.display = 'none';
        this.elements.playbackControls.style.display = 'none';
        this.stopPlayback();
        
        // Reset showing optimal state
        this.playback.active = false;
        
        switch(levelId) {
            case 'bubble-sort': this.initBubbleSort(); break;
            case 'binary-search': this.initBinarySearch(); break;
            case 'bst-search': this.initBST(); break;
            case 'bfs-grid': this.initBFS(); break;
        }
    }

    showMenu() {
        this.stopPlayback();
        this.elements.gameArea.classList.remove('active');
        this.elements.menu.classList.add('active');
        this.elements.victoryModal.classList.remove('open');
        this.currentLevel = null;
    }

    retryLevel() {
        if (this.currentLevel) {
            this.startLevel(this.currentLevel);
        }
    }

    showVictory(message, statsHTML = '') {
        this.elements.victoryMessage.textContent = message;
        this.elements.victoryStats.innerHTML = statsHTML;
        this.elements.victoryModal.classList.add('open');
        this.elements.btnShowOptimal.style.display = 'inline-block';
    }

    showOptimal() {
        this.elements.victoryModal.classList.remove('open');
        this.playback.active = true;
        this.playback.step = 0;
        this.playback.playing = false;
        this.elements.playbackControls.style.display = 'flex';
        this.updatePlayButton();
        
        this.prepareOptimalSequence();
        this.renderFrame();
    }

    // --- Playback System ---

    prepareOptimalSequence() {
        this.playback.sequence = [];
        
        if (this.currentLevel === 'bubble-sort') {
            // Generate standard bubble sort swaps
            let arr = [...this.gameState.initialArray];
            this.playback.sequence.push({ type: 'init', arr: [...arr], selected: [] });
            
            let n = arr.length;
            for (let i = 0; i < n - 1; i++) {
                for (let j = 0; j < n - i - 1; j++) {
                    // Highlight comparison
                    this.playback.sequence.push({ type: 'compare', arr: [...arr], selected: [j, j+1] });
                    
                    if (arr[j] > arr[j + 1]) {
                        // Swap
                        let temp = arr[j];
                        arr[j] = arr[j + 1];
                        arr[j + 1] = temp;
                        this.playback.sequence.push({ type: 'swap', arr: [...arr], selected: [j, j+1] });
                    }
                }
                // Mark sorted
                // We can infer sorted elements in render based on i
            }
            this.playback.sequence.push({ type: 'done', arr: [...arr], selected: [] });
            
        } else if (this.currentLevel === 'binary-search') {
            // Optimal path is stored in gameState.optimalPath
            // Generate sequence of narrowing ranges
            const arr = this.gameState.array;
            const target = this.gameState.target;
            const path = this.gameState.optimalPath; // indices
            let l = 0, r = arr.length - 1;
            
            this.playback.sequence.push({ low: l, high: r, mid: null, found: false });
            
            path.forEach(idx => {
                this.playback.sequence.push({ low: l, high: r, mid: idx, found: false });
                if (arr[idx] === target) {
                    this.playback.sequence.push({ low: l, high: r, mid: idx, found: true });
                } else if (arr[idx] < target) {
                    l = idx + 1;
                    this.playback.sequence.push({ low: l, high: r, mid: null, found: false });
                } else {
                    r = idx - 1;
                    this.playback.sequence.push({ low: l, high: r, mid: null, found: false });
                }
            });

        } else if (this.currentLevel === 'bst-search') {
            // Path is in gameState.optimalPath
            const path = this.gameState.optimalPath;
            this.playback.sequence.push({ visited: [], current: null });
            
            for(let i=0; i<path.length; i++) {
                const visited = path.slice(0, i+1);
                const current = path[i];
                this.playback.sequence.push({ visited, current });
            }
            // Final state found
            this.playback.sequence.push({ visited: path, current: path[path.length-1], found: true });

        } else if (this.currentLevel === 'bfs-grid') {
            // Re-run BFS to get full expansion order for animation? 
            // Or just animate the path?
            // "Optimal solution" usually implies showing the path. 
            // Let's animate the optimal path drawing.
            const path = this.gameState.optimalPath;
            this.playback.sequence.push({ path: [] });
            for(let i=0; i<path.length; i++) {
                this.playback.sequence.push({ path: path.slice(0, i+1) });
            }
        }
        
        this.playback.maxSteps = this.playback.sequence.length - 1;
        this.updatePlaybackStatus();
    }

    renderFrame() {
        const stepIndex = this.playback.step;
        const state = this.playback.sequence[stepIndex];
        
        if (this.currentLevel === 'bubble-sort') {
            const wrapper = this.elements.canvasWrapper;
            wrapper.innerHTML = '';
            wrapper.style.alignItems = 'flex-end';
            
            state.arr.forEach((value, index) => {
                const bar = document.createElement('div');
                bar.className = 'bar';
                bar.style.height = `${value * 3}px`;
                
                if (state.selected.includes(index)) {
                    bar.classList.add('selected');
                }
                
                const label = document.createElement('div');
                label.className = 'bar-value';
                label.textContent = value;
                bar.appendChild(label);
                wrapper.appendChild(bar);
            });
            
        } else if (this.currentLevel === 'binary-search') {
            const wrapper = this.elements.canvasWrapper;
            wrapper.innerHTML = '';
            wrapper.style.alignItems = 'center';
            wrapper.style.flexWrap = 'wrap';
            wrapper.style.alignContent = 'center';
            
            this.gameState.array.forEach((value, index) => {
                const cell = document.createElement('div');
                cell.className = 'array-cell';
                cell.textContent = '?';
                
                // Show values in current range or if found/mid
                const inRange = index >= state.low && index <= state.high;
                
                if (index === state.mid) {
                    cell.textContent = value;
                    cell.style.borderColor = '#ffff00';
                    cell.style.borderWidth = '2px';
                    if (state.found) cell.classList.add('found');
                    else cell.classList.add('checked');
                } else if (!inRange) {
                    cell.style.opacity = '0.3';
                }
                
                wrapper.appendChild(cell);
            });

        } else if (this.currentLevel === 'bst-search') {
            // Render BST with custom highlighting
            // We reuse renderBST but modify it or copy logic?
            // Copy logic is safer to avoid polluting game logic
            const wrapper = this.elements.canvasWrapper;
            wrapper.innerHTML = '';
            const container = document.createElement('div');
            container.className = 'tree-container';
            
            this.gameState.nodes.forEach((node, i) => {
                if (i > 0) {
                     // Draw links (simplified for now as before)
                }
            });

            this.gameState.nodes.forEach((node, i) => {
                const el = document.createElement('div');
                el.className = 'tree-node';
                el.textContent = node.val;
                
                const depth = Math.floor(Math.log2(i + 1));
                const levelStart = Math.pow(2, depth) - 1;
                const positionInLevel = i - levelStart;
                const totalInLevel = Math.pow(2, depth);
                const x = (positionInLevel + 0.5) * (100 / totalInLevel);
                const y = depth * 80 + 40;
                
                el.style.left = `calc(${x}% - 25px)`;
                el.style.top = `${y}px`;

                if (state.visited.includes(i)) {
                    el.classList.add('visited');
                    el.style.borderColor = '#ffff00';
                }
                if (i === state.current) {
                    el.style.backgroundColor = '#333';
                    if (state.found) el.classList.add('found');
                }
                
                container.appendChild(el);
            });
            wrapper.appendChild(container);

        } else if (this.currentLevel === 'bfs-grid') {
            const wrapper = this.elements.canvasWrapper;
            wrapper.innerHTML = '';
            const container = document.createElement('div');
            container.className = 'grid-container';
            container.style.gridTemplateColumns = `repeat(${this.gameState.cols}, 30px)`;

            const pathSet = new Set(state.path.map(p => `${p.r},${p.c}`));

            this.gameState.grid.forEach(row => {
                row.forEach(cell => {
                    const el = document.createElement('div');
                    el.className = 'grid-cell';
                    if (cell.type === 'wall') el.classList.add('wall');
                    if (cell.type === 'start') el.classList.add('start');
                    if (cell.type === 'end') el.classList.add('end');
                    
                    if (pathSet.has(`${cell.r},${cell.c}`) && cell.type !== 'start' && cell.type !== 'end') {
                         el.style.backgroundColor = '#ffff00'; 
                         el.textContent = '•';
                         el.style.color = 'black';
                    }
                    container.appendChild(el);
                });
            });
            wrapper.appendChild(container);
        }
        
        this.updatePlaybackStatus();
    }

    // Controls
    togglePlay() {
        if (this.playback.playing) {
            this.stopPlayback();
        } else {
            this.startPlayback();
        }
    }

    startPlayback() {
        if (this.playback.step >= this.playback.maxSteps) {
            this.playback.step = 0;
        }
        this.playback.playing = true;
        this.updatePlayButton();
        this.playback.interval = setInterval(() => {
            if (this.playback.step < this.playback.maxSteps) {
                this.playback.step++;
                this.renderFrame();
            } else {
                this.stopPlayback();
            }
        }, 600);
    }

    stopPlayback() {
        this.playback.playing = false;
        clearInterval(this.playback.interval);
        this.updatePlayButton();
    }

    stepPlayback() {
        this.stopPlayback();
        if (this.playback.step < this.playback.maxSteps) {
            this.playback.step++;
            this.renderFrame();
        }
    }

    resetPlayback() {
        this.stopPlayback();
        this.playback.step = 0;
        this.renderFrame();
    }

    updatePlayButton() {
        this.elements.btnPlay.textContent = this.playback.playing ? "⏸ Pause" : "▶ Play";
    }

    updatePlaybackStatus() {
        this.elements.playbackStatus.textContent = `Step ${this.playback.step} / ${this.playback.maxSteps}`;
    }

    updateStats(text) {
        this.elements.stats.textContent = text;
    }

    // --- Level 1: Bubble Sort ---
    initBubbleSort() {
        this.elements.levelTitle.textContent = "Bubble Sort";
        this.elements.instructions.textContent = "Click two adjacent bars to swap them if they are in the wrong order (left > right).";
        this.elements.levelExplanation.innerHTML = `
            <strong>Bubble Sort</strong> works by repeatedly stepping through the list, comparing adjacent elements and swapping them if they are in the wrong order. 
            <br><br>
            Efficiency: <span style="color:#ff5555">O(N²)</span>
            <br>
            <strong>Goal:</strong> Sort the bars by height.
        `;
        
        const size = 8;
        const array = Array.from({length: size}, () => Math.floor(Math.random() * 80) + 10);
        
        // Calculate optimal moves
        let inversions = 0;
        const tempArr = [...array];
        for(let i=0; i<size; i++) {
            for(let j=i+1; j<size; j++) {
                if(tempArr[i] > tempArr[j]) inversions++;
            }
        }

        this.gameState = {
            initialArray: [...array], // Save initial for reset
            array: array,
            moves: 0,
            optimalMoves: inversions,
            selected: null
        };

        this.renderBubbleSort();
    }

    renderBubbleSort() {
        const wrapper = this.elements.canvasWrapper;
        wrapper.innerHTML = '';
        wrapper.style.alignItems = 'flex-end'; // Align bars to bottom
        this.updateStats(`Moves: ${this.gameState.moves} / Optimal: ${this.gameState.optimalMoves}`);

        this.gameState.array.forEach((value, index) => {
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = `${value * 3}px`;
            
            if (this.gameState.selected === index) {
                bar.classList.add('selected');
            }
            
            const label = document.createElement('div');
            label.className = 'bar-value';
            label.textContent = value;
            bar.appendChild(label);

            if (!this.playback.active) {
                bar.onclick = () => this.handleBubbleSortClick(index);
            }
            wrapper.appendChild(bar);
        });
        
        if (!this.playback.active) {
            this.checkBubbleSortWin();
        }
    }

    handleBubbleSortClick(index) {
        if (this.gameState.selected === null) {
            this.gameState.selected = index;
        } else {
            const first = this.gameState.selected;
            const second = index;
            
            if (Math.abs(first - second) === 1) {
                const temp = this.gameState.array[first];
                this.gameState.array[first] = this.gameState.array[second];
                this.gameState.array[second] = temp;
                this.gameState.moves++;
                this.gameState.selected = null;
            } else if (first === second) {
                this.gameState.selected = null;
            } else {
                this.gameState.selected = second;
            }
        }
        this.renderBubbleSort();
    }

    checkBubbleSortWin() {
        const arr = this.gameState.array;
        let isSorted = true;
        for (let i = 0; i < arr.length - 1; i++) {
            if (arr[i] > arr[i + 1]) {
                isSorted = false;
                break;
            }
        }

        if (isSorted) {
            const bars = document.querySelectorAll('.bar');
            bars.forEach(b => b.classList.add('sorted'));
            
            const accuracy = Math.max(0, Math.round((this.gameState.optimalMoves / Math.max(1, this.gameState.moves)) * 100));
            
            setTimeout(() => {
                this.showVictory(
                    `Sorted!`, 
                    `Moves: ${this.gameState.moves}<br>Optimal: ${this.gameState.optimalMoves}<br>Accuracy: <span style="color:${this.getScoreColor(accuracy)}">${accuracy}%</span>`
                );
            }, 500);
        }
    }

    // --- Level 2: Binary Search ---
    initBinarySearch() {
        this.elements.levelTitle.textContent = "Binary Search";
        this.elements.instructions.innerHTML = `Find the hidden number. Click indices to reveal.`;
        this.elements.levelExplanation.innerHTML = `
            <strong>Binary Search</strong> is an efficient algorithm for finding an item from a <em>sorted</em> list.
            <br>
            Efficiency: <span style="color:#00ff00">O(log N)</span>
            <br>
            <strong>Goal:</strong> Find the target by splitting the range in half.
        `;
        
        const size = 15;
        let arr = [];
        let current = 10;
        for(let i=0; i<size; i++) {
            current += Math.floor(Math.random() * 10) + 1;
            arr.push(current);
        }
        
        const targetIndex = Math.floor(Math.random() * size);
        const targetValue = arr[targetIndex];

        // Calculate optimal moves
        let optMoves = 0;
        let l = 0, r = size - 1;
        let optimalPath = []; 
        
        while (l <= r) {
            optMoves++;
            let mid = Math.floor((l + r) / 2);
            optimalPath.push(mid);
            if (arr[mid] === targetValue) break;
            if (arr[mid] < targetValue) l = mid + 1;
            else r = mid - 1;
        }

        this.gameState = {
            array: arr,
            target: targetValue,
            clicks: 0,
            optimalMoves: optMoves,
            optimalPath: optimalPath,
            low: 0,
            high: size - 1,
            history: []
        };
        
        this.elements.instructions.innerHTML = `Find <span style="color:#00ffff; font-weight:bold;">${targetValue}</span> efficiently.`;
        this.renderBinarySearch();
    }

    renderBinarySearch() {
        const wrapper = this.elements.canvasWrapper;
        wrapper.innerHTML = '';
        wrapper.style.alignItems = 'center';
        wrapper.style.flexWrap = 'wrap';
        wrapper.style.alignContent = 'center';

        this.updateStats(`Clicks: ${this.gameState.clicks}`);

        this.gameState.array.forEach((value, index) => {
            const cell = document.createElement('div');
            cell.className = 'array-cell';
            cell.textContent = '?';
            
            const isRevealed = this.gameState.history.includes(index);
            const inRange = index >= this.gameState.low && index <= this.gameState.high;

            if (isRevealed) {
                cell.textContent = value;
                if (value === this.gameState.target) {
                    cell.classList.add('found');
                } else {
                    cell.classList.add('checked');
                }
            } else if (!inRange) {
                cell.style.opacity = '0.3';
            }

            if (!this.playback.active && inRange && !isRevealed) {
                cell.onclick = () => this.handleBinarySearchClick(index, value);
            } else {
                cell.style.cursor = 'default';
            }

            wrapper.appendChild(cell);
        });
    }

    handleBinarySearchClick(index, value) {
        this.gameState.clicks++;
        this.gameState.history.push(index);
        
        if (value === this.gameState.target) {
            this.renderBinarySearch();
            
            const accuracy = Math.max(0, Math.round((this.gameState.optimalMoves / Math.max(1, this.gameState.clicks)) * 100));

            setTimeout(() => {
                this.showVictory(
                    `Found ${value}!`,
                    `Clicks: ${this.gameState.clicks}<br>Optimal: ${this.gameState.optimalMoves}<br>Accuracy: <span style="color:${this.getScoreColor(accuracy)}">${accuracy}%</span>`
                );
            }, 500);
            return;
        }

        if (value < this.gameState.target) {
            this.gameState.low = index + 1;
        } else {
            this.gameState.high = index - 1;
        }

        this.renderBinarySearch();
    }

    // --- Level 3: BST Search ---
    initBST() {
        this.elements.levelTitle.textContent = "BST Search";
        this.elements.levelExplanation.innerHTML = `
            <strong>Binary Search Tree (BST)</strong>: Left child < Node < Right child.
            <br>
            Efficiency: <span style="color:#00ff00">O(log N)</span>
            <br>
            <strong>Goal:</strong> Find the target node.
        `;

        const values = [50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43, 55, 68, 81, 93];
        const nodes = [];
        values.forEach((v, i) => nodes.push({ val: v, id: i, visited: false }));
        
        const targetIdx = Math.floor(Math.random() * nodes.length);
        const targetVal = nodes[targetIdx].val;

        let optimalPath = [];
        let curr = 0;
        while(curr < nodes.length) {
            optimalPath.push(curr);
            if(nodes[curr].val === targetVal) break;
            if(targetVal < nodes[curr].val) {
                curr = 2 * curr + 1;
            } else {
                curr = 2 * curr + 2;
            }
        }
        
        let optimalMoves = optimalPath.length;

        this.gameState = {
            nodes: nodes,
            target: targetVal,
            currentIdx: 0, 
            moves: 0,
            optimalMoves: optimalMoves,
            optimalPath: optimalPath,
            path: [0]
        };
        
        this.elements.instructions.innerHTML = `Locate the value <span style="color:#ff00ff; font-weight:bold;">${targetVal}</span>.`;
        this.renderBST();
    }

    renderBST() {
        const wrapper = this.elements.canvasWrapper;
        wrapper.innerHTML = '';
        wrapper.style.display = 'block'; 
        wrapper.style.position = 'relative';

        const container = document.createElement('div');
        container.className = 'tree-container';
        
        this.gameState.nodes.forEach((node, i) => {
            const el = document.createElement('div');
            el.className = 'tree-node';
            el.textContent = node.val;
            
            const depth = Math.floor(Math.log2(i + 1));
            const levelStart = Math.pow(2, depth) - 1;
            const positionInLevel = i - levelStart;
            const totalInLevel = Math.pow(2, depth);
            const x = (positionInLevel + 0.5) * (100 / totalInLevel);
            const y = depth * 80 + 40;
            
            el.style.left = `calc(${x}% - 25px)`;
            el.style.top = `${y}px`;

            if (this.gameState.path.includes(i)) {
                el.classList.add('visited');
            }
            
            if (node.val === this.gameState.target) {
                el.classList.add('target');
            }

            if (i === this.gameState.currentIdx) {
                el.style.borderColor = '#00ffff';
                el.style.backgroundColor = '#222';
            }

            if (!this.playback.active) {
                const leftChild = 2 * this.gameState.currentIdx + 1;
                const rightChild = 2 * this.gameState.currentIdx + 2;
                if (i === leftChild || i === rightChild) {
                    el.style.cursor = 'pointer';
                    el.onclick = () => this.handleBSTClick(i);
                }
            }

            if (i === this.gameState.currentIdx && node.val === this.gameState.target) {
                el.classList.add('found');
            }

            container.appendChild(el);
        });

        wrapper.appendChild(container);
        this.updateStats(`Steps: ${this.gameState.moves}`);
    }

    handleBSTClick(index) {
        this.gameState.moves++;
        this.gameState.path.push(index);
        this.gameState.currentIdx = index;
        
        const val = this.gameState.nodes[index].val;
        
        if (val === this.gameState.target) {
            this.renderBST();
            const accuracy = Math.max(0, Math.round((this.gameState.optimalMoves / Math.max(1, this.gameState.moves)) * 100));
            
            setTimeout(() => {
                this.showVictory(
                    `Found it!`,
                    `Steps: ${this.gameState.moves}<br>Optimal: ${this.gameState.optimalMoves}<br>Accuracy: <span style="color:${this.getScoreColor(accuracy)}">${accuracy}%</span>`
                );
            }, 500);
        } else {
            this.renderBST();
        }
    }

    // --- Level 4: Graph BFS ---
    initBFS() {
        this.elements.levelTitle.textContent = "Graph BFS";
        this.elements.levelExplanation.innerHTML = `
            <strong>Breadth-First Search (BFS)</strong> explores neighbor nodes layer by layer.
            <br>
            Efficiency: <span style="color:#00ff00">O(V + E)</span>
            <br>
            <strong>Goal:</strong> Find shortest path to END.
        `;

        const rows = 10, cols = 10;
        const grid = [];
        for(let r=0; r<rows; r++) {
            const row = [];
            for(let c=0; c<cols; c++) {
                row.push({ type: 'empty', visited: false, r, c });
            }
            grid.push(row);
        }
        
        const start = {r: 1, c: 1};
        const end = {r: 8, c: 8};
        grid[start.r][start.c].type = 'start';
        grid[end.r][end.c].type = 'end';
        grid[start.r][start.c].visited = true;

        for(let i=0; i<25; i++) {
            const wr = Math.floor(Math.random()*rows);
            const wc = Math.floor(Math.random()*cols);
            if (grid[wr][wc].type === 'empty') {
                grid[wr][wc].type = 'wall';
            }
        }
        
        const optimal = this.calculateBFS(grid, start, end);
        
        if (optimal.dist === -1) {
            this.initBFS(); 
            return; 
        }

        this.gameState = {
            grid, rows, cols,
            start, end,
            current: [start], 
            moves: 0,
            optimalDist: optimal.dist,
            optimalPath: optimal.path, 
            userPathLength: 0
        };

        this.elements.instructions.innerHTML = `Click neighbors of visited area to expand.`;
        this.renderBFS();
    }

    calculateBFS(grid, start, end) {
        const q = [{r: start.r, c: start.c, d: 0, path: []}];
        const visited = new Set();
        visited.add(`${start.r},${start.c}`);
        
        const dr = [0, 0, 1, -1];
        const dc = [1, -1, 0, 0];

        while(q.length > 0) {
            const {r, c, d, path} = q.shift();
            const currentPath = [...path, {r, c}];
            
            if (r === end.r && c === end.c) return { dist: d, path: currentPath };
            
            for(let i=0; i<4; i++) {
                const nr = r + dr[i];
                const nc = c + dc[i];
                
                if (nr>=0 && nr<10 && nc>=0 && nc<10 && 
                    !visited.has(`${nr},${nc}`) && 
                    grid[nr][nc].type !== 'wall') {
                    visited.add(`${nr},${nc}`);
                    q.push({r: nr, c: nc, d: d+1, path: currentPath});
                }
            }
        }
        return { dist: -1, path: [] };
    }

    renderBFS() {
        const wrapper = this.elements.canvasWrapper;
        wrapper.innerHTML = '';
        wrapper.style.display = 'block';
        
        const container = document.createElement('div');
        container.className = 'grid-container';
        container.style.gridTemplateColumns = `repeat(${this.gameState.cols}, 30px)`;

        this.gameState.grid.forEach(row => {
            row.forEach(cell => {
                const el = document.createElement('div');
                el.className = 'grid-cell';
                if (cell.type === 'wall') el.classList.add('wall');
                if (cell.type === 'start') el.classList.add('start');
                if (cell.type === 'end') el.classList.add('end');
                if (cell.visited) el.classList.add('visited');
                
                if (!this.playback.active && !cell.visited && cell.type !== 'wall') {
                    if (this.isNeighborOfVisited(cell.r, cell.c)) {
                        el.style.cursor = 'pointer';
                        el.style.border = '1px solid #555'; 
                        el.onclick = () => this.handleBFSClick(cell.r, cell.c);
                    }
                }
                
                container.appendChild(el);
            });
        });

        wrapper.appendChild(container);
        this.updateStats(`Distance: ${this.gameState.userPathLength}`);
    }

    isNeighborOfVisited(r, c) {
        const dr = [0, 0, 1, -1];
        const dc = [1, -1, 0, 0];
        for(let i=0; i<4; i++) {
            const nr = r + dr[i];
            const nc = c + dc[i];
            if (nr>=0 && nr<this.gameState.rows && nc>=0 && nc<this.gameState.cols) {
                if (this.gameState.grid[nr][nc].visited) return true;
            }
        }
        return false;
    }

    handleBFSClick(r, c) {
        this.gameState.grid[r][c].visited = true;
        this.gameState.userPathLength++; 

        if (r === this.gameState.end.r && c === this.gameState.end.c) {
            this.renderBFS();
            
            setTimeout(() => {
                this.showVictory(
                    `Destination Reached!`,
                    `Shortest Path Possible: ${this.gameState.optimalDist}<br>(You explored ${this.gameState.userPathLength} nodes)`
                );
            }, 500);
        } else {
            this.renderBFS();
        }
    }

    getScoreColor(score) {
        if (score >= 90) return '#00ff00';
        if (score >= 70) return '#ffff00';
        return '#ff5555';
    }
}

const game = new DSAGame();
