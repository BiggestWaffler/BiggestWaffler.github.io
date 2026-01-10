class DSAGame {
    constructor() {
        this.currentLevel = null;
        this.currentDifficulty = 'medium';
        this.selectedLevelId = null; // For the modal
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
            mainMenu: document.getElementById('main-menu'),
            challengesMenu: document.getElementById('challenges-menu'),
            visualizationsMenu: document.getElementById('visualizations-menu'),
            menu: document.getElementById('challenges-menu'), // Legacy support
            gameArea: document.getElementById('game-area'),
            visualizationArea: document.getElementById('visualization-area'),
            vizCanvas: document.getElementById('viz-canvas'),
            vizTitle: document.getElementById('viz-title'),
            vizSpeed: document.getElementById('viz-speed'),
            vizSize: document.getElementById('viz-size'),
            btnVizPlay: document.getElementById('btn-viz-play'),
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
            btnPlay: document.getElementById('btn-play'),
            difficultyModal: document.getElementById('difficulty-modal')
        };
        
        // Visualization State
        this.vizState = {
            array: [],
            running: false,
            paused: false,
            speed: 50,
            algorithm: null,
            abortController: null
        };
        
        this.audioCtx = null;
    }

    // --- Navigation ---

    showMainMenu() {
        this.resetAll();
        this.elements.mainMenu.classList.add('active');
    }

    showChallenges() {
        this.resetAll();
        this.elements.challengesMenu.classList.add('active');
    }

    showVisualizations() {
        this.resetAll();
        this.elements.visualizationsMenu.classList.add('active');
    }

    resetAll() {
        this.stopPlayback();
        if (this.vizState.abortController) this.vizState.abortController.abort();
        this.vizState.running = false;
        
        document.querySelectorAll('.screen').forEach(el => el.classList.remove('active'));
        this.elements.difficultyModal.classList.remove('open');
        this.elements.victoryModal.classList.remove('open');
        this.currentLevel = null;
    }

    selectLevel(levelId) {
        this.selectedLevelId = levelId;
        this.elements.difficultyModal.classList.add('open');
    }

    closeDifficultyModal() {
        this.elements.difficultyModal.classList.remove('open');
        this.selectedLevelId = null;
    }

    startLevel(difficulty) {
        const levelId = this.selectedLevelId || this.currentLevel; 
        if (!levelId) return;

        this.currentDifficulty = difficulty;
        
        this.resetAll();
        
        // Restore currentLevel after resetAll clears it
        this.currentLevel = levelId;
        
        this.elements.gameArea.classList.add('active');
        
        this.elements.canvasWrapper.innerHTML = '';
        this.elements.accuracyDisplay.style.display = 'none';
        this.elements.playbackControls.style.display = 'none';
        
        // Reset styles
        this.elements.canvasWrapper.style.flexWrap = '';
        this.elements.canvasWrapper.style.alignItems = '';
        this.elements.canvasWrapper.style.flexDirection = '';
        this.elements.canvasWrapper.style.alignContent = '';

        this.stopPlayback();
        this.playback.active = false;
        
        switch(levelId) {
            case 'bubble-sort': this.initBubbleSort(); break;
            case 'binary-search': this.initBinarySearch(); break;
            case 'bst-search': this.initBST(); break;
            case 'bfs-grid': this.initBFS(); break;
            case 'dijkstra': this.initDijkstra(); break;
            case 'hanoi': this.initHanoi(); break;
        }
    }

    showMenu() {
        // Fallback for buttons that call this
        this.showChallenges();
    }

    retryLevel() {
        if (this.currentLevel && this.currentDifficulty) {
            // Mock setting selectedLevelId so startLevel works
            this.selectedLevelId = this.currentLevel;
            this.startLevel(this.currentDifficulty);
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
            }
            this.playback.sequence.push({ type: 'done', arr: [...arr], selected: [] });
            
        } else if (this.currentLevel === 'binary-search') {
            const arr = this.gameState.array;
            const target = this.gameState.target;
            const path = this.gameState.optimalPath; 
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
            const path = this.gameState.optimalPath;
            this.playback.sequence.push({ visited: [], current: null });
            
            for(let i=0; i<path.length; i++) {
                const visited = path.slice(0, i+1);
                const current = path[i];
                this.playback.sequence.push({ visited, current });
            }
            this.playback.sequence.push({ visited: path, current: path[path.length-1], found: true });

        } else if (this.currentLevel === 'bfs-grid') {
            const expansion = this.getBFSExpansionOrder(this.gameState.grid, this.gameState.start, this.gameState.end);
            this.playback.sequence = expansion;

        } else if (this.currentLevel === 'dijkstra') {
            const expansion = this.getDijkstraExpansionOrder(this.gameState.grid, this.gameState.start, this.gameState.end);
            this.playback.sequence = expansion;

        } else if (this.currentLevel === 'hanoi') {
            // Reconstruct the optimal sequence
            const sequence = [];
            const n = this.gameState.numDisks;
            
            // Initial state
            const initialTowers = [[], [], []];
            for(let i=n; i>=1; i--) initialTowers[0].push(i);
            
            sequence.push({ towers: JSON.parse(JSON.stringify(initialTowers)), move: null });
            
            const moves = [];
            this.getHanoiMoves(n, 0, 2, 1, moves);
            
            // Apply moves to generate states
            let currentTowers = JSON.parse(JSON.stringify(initialTowers));
            moves.forEach(move => {
                const disk = currentTowers[move.from].pop();
                currentTowers[move.to].push(disk);
                sequence.push({ 
                    towers: JSON.parse(JSON.stringify(currentTowers)), 
                    move: { from: move.from, to: move.to } 
                });
            });
            
            this.playback.sequence = sequence;
        }
        
        this.playback.maxSteps = this.playback.sequence.length - 1;
        this.updatePlaybackStatus();
    }

    getBFSExpansionOrder(grid, start, end) {
        const steps = [];
        const q = [{r: start.r, c: start.c}];
        const visited = new Set();
        visited.add(`${start.r},${start.c}`);
        
        const visitedList = [`${start.r},${start.c}`];
        steps.push({ visited: [...visitedList], path: [], current: {r: start.r, c: start.c} });

        const parent = new Map();

        const dr = [0, 0, 1, -1];
        const dc = [1, -1, 0, 0];
        const rows = grid.length;
        const cols = grid[0].length;
        
        let found = false;

        while(q.length > 0) {
            const curr = q.shift();
            
            if (curr.r === end.r && curr.c === end.c) {
                found = true;
                break;
            }
            
            for(let i=0; i<4; i++) {
                const nr = curr.r + dr[i];
                const nc = curr.c + dc[i];
                const key = `${nr},${nc}`;
                
                if (nr>=0 && nr<rows && nc>=0 && nc<cols && 
                    !visited.has(key) && grid[nr][nc].type !== 'wall') {
                    
                    visited.add(key);
                    visitedList.push(key);
                    parent.set(key, curr);
                    q.push({r: nr, c: nc});
                    
                    steps.push({ visited: [...visitedList], path: [], current: {r: nr, c: nc} });
                    
                    if (nr === end.r && nc === end.c) {
                        found = true;
                        break;
                    }
                }
            }
            if(found) break;
        }
        
        const path = [];
        let curr = {r: end.r, c: end.c};
        while(curr) {
            path.push(curr);
            const key = `${curr.r},${curr.c}`;
            if (curr.r === start.r && curr.c === start.c) break;
            curr = parent.get(key);
        }
        path.reverse(); 
        
        steps.push({ visited: [...visitedList], path: path, current: null });
        return steps;
    }
    
    getDijkstraExpansionOrder(grid, start, end) {
        const steps = [];
        const pq = [{r: start.r, c: start.c, dist: 0}];
        const dists = new Map();
        const parent = new Map();
        const visitedList = [];
        const rows = grid.length;
        const cols = grid[0].length;
        
        dists.set(`${start.r},${start.c}`, 0);
        
        const dr = [0, 0, 1, -1];
        const dc = [1, -1, 0, 0];
        
        let found = false;
        
        while(pq.length > 0) {
            pq.sort((a, b) => a.dist - b.dist);
            const curr = pq.shift();
            const currKey = `${curr.r},${curr.c}`;
            
            if (!visitedList.includes(currKey)) {
                visitedList.push(currKey);
                steps.push({ visited: [...visitedList], path: [], current: curr });
            }

            if (curr.r === end.r && curr.c === end.c) {
                found = true;
                break;
            }

            for(let i=0; i<4; i++) {
                const nr = curr.r + dr[i];
                const nc = curr.c + dc[i];
                const nKey = `${nr},${nc}`;
                
                if (nr>=0 && nr<rows && nc>=0 && nc<cols && grid[nr][nc].type !== 'wall') {
                    const weight = grid[nr][nc].weight;
                    const newDist = curr.dist + weight;
                    
                    if (!dists.has(nKey) || newDist < dists.get(nKey)) {
                        dists.set(nKey, newDist);
                        parent.set(nKey, curr);
                        pq.push({r: nr, c: nc, dist: newDist});
                    }
                }
            }
        }
        
        const path = [];
        let curr = {r: end.r, c: end.c};
        if (dists.has(`${end.r},${end.c}`)) {
             while(curr) {
                path.push(curr);
                if (curr.r === start.r && curr.c === start.c) break;
                curr = parent.get(`${curr.r},${curr.c}`);
            }
            path.reverse();
        }

        steps.push({ visited: [...visitedList], path: path, current: null });
        return steps;
    }

    getHanoiMoves(n, from, to, aux, moves) {
        if (n === 1) {
            moves.push({ from, to });
            return;
        }
        this.getHanoiMoves(n - 1, from, aux, to, moves);
        moves.push({ from, to });
        this.getHanoiMoves(n - 1, aux, to, from, moves);
    }

    renderFrame() {
        const stepIndex = this.playback.step;
        const state = this.playback.sequence[stepIndex];
        
        if (this.currentLevel === 'bubble-sort') {
            const wrapper = this.elements.canvasWrapper;
            wrapper.innerHTML = '';
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'row';
            wrapper.style.flexWrap = 'nowrap';
            wrapper.style.alignItems = 'flex-end';
            
            state.arr.forEach((value, index) => {
                const bar = document.createElement('div');
                bar.className = 'bar';
                if (this.currentDifficulty === 'hard') bar.style.width = '20px'; // thinner bars
                bar.style.height = `${value * 3}px`;
                if (state.selected.includes(index)) bar.classList.add('selected');
                
                const label = document.createElement('div');
                label.className = 'bar-value';
                if (this.currentDifficulty === 'hard') label.style.display = 'none'; // Hide text for hard
                label.textContent = value;
                bar.appendChild(label);
                wrapper.appendChild(bar);
            });
            
        } else if (this.currentLevel === 'binary-search') {
            const wrapper = this.elements.canvasWrapper;
            wrapper.innerHTML = '';
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'center';
            wrapper.style.flexWrap = 'wrap';
            wrapper.style.alignContent = 'center';
            
            this.gameState.array.forEach((value, index) => {
                const cell = document.createElement('div');
                cell.className = 'array-cell';
                if (this.currentDifficulty === 'hard') cell.style.width = '30px'; // smaller cells for hard
                cell.textContent = '?';
                
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
            const wrapper = this.elements.canvasWrapper;
            wrapper.innerHTML = '';
            wrapper.style.display = 'block'; // Reset flex
            const container = document.createElement('div');
            container.className = 'tree-container';
            
            const totalNodes = this.gameState.nodes.length;
            
            this.gameState.nodes.forEach((node, i) => {
                const el = document.createElement('div');
                el.className = 'tree-node';
                if (totalNodes > 15) {
                    el.style.width = '30px';
                    el.style.height = '30px';
                    el.style.fontSize = '10px';
                }
                el.textContent = node.val;
                
                const depth = Math.floor(Math.log2(i + 1));
                const totalInLevel = Math.pow(2, depth);
                const x = ((i - (totalInLevel - 1)) + 0.5) * (100 / totalInLevel);
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

        } else if (this.currentLevel === 'bfs-grid' || this.currentLevel === 'dijkstra') {
            const wrapper = this.elements.canvasWrapper;
            wrapper.innerHTML = '';
            wrapper.style.display = 'block';
            const container = document.createElement('div');
            container.className = 'grid-container';
            // Adjust cell size for Hard difficulty
            const cellSize = this.currentDifficulty === 'hard' ? 20 : 30;
            container.style.gridTemplateColumns = `repeat(${this.gameState.cols}, ${cellSize}px)`;

            const visitedSet = new Set(state.visited);
            const pathSet = new Set(state.path.map(p => `${p.r},${p.c}`));

            this.gameState.grid.forEach(row => {
                row.forEach(cell => {
                    const el = document.createElement('div');
                    el.className = 'grid-cell';
                    if (this.currentDifficulty === 'hard') {
                         el.style.width = '20px';
                         el.style.height = '20px';
                         el.style.fontSize = '8px';
                    }

                    if (this.currentLevel === 'dijkstra') {
                        el.classList.add('dijkstra');
                        if (cell.type !== 'wall') el.textContent = cell.weight;
                    }

                    if (cell.type === 'wall') el.classList.add('wall');
                    if (cell.type === 'start') el.classList.add('start');
                    if (cell.type === 'end') el.classList.add('end');
                    
                    const key = `${cell.r},${cell.c}`;
                    if (visitedSet.has(key) && cell.type !== 'start' && cell.type !== 'end') {
                         el.classList.add('visited');
                    }
                    
                    if (pathSet.has(key) && cell.type !== 'start' && cell.type !== 'end') {
                         el.style.backgroundColor = '#ffff00'; 
                         el.style.color = 'black';
                    }
                    
                    if (state.current && state.current.r === cell.r && state.current.c === cell.c) {
                        el.style.border = '2px solid #ffffff';
                    }

                    container.appendChild(el);
                });
            });
            wrapper.appendChild(container);

        } else if (this.currentLevel === 'hanoi') {
            const wrapper = this.elements.canvasWrapper;
            wrapper.innerHTML = '';
            wrapper.style.display = 'flex';
            wrapper.style.justifyContent = 'space-around';
            wrapper.style.alignItems = 'flex-end';
            wrapper.style.paddingBottom = '50px'; // Space for base
            
            // Render towers based on state.towers
            state.towers.forEach((towerStack, towerIndex) => {
                const towerEl = document.createElement('div');
                towerEl.className = 'tower';
                
                // Base
                const pole = document.createElement('div');
                pole.className = 'tower-pole';
                towerEl.appendChild(pole);
                
                // Disks container
                const disksContainer = document.createElement('div');
                disksContainer.className = 'disks-container';
                
                towerStack.forEach(diskSize => {
                    const disk = document.createElement('div');
                    disk.className = 'disk';
                    // Size: smallest (1) is 40px, largest (5) is 120px
                    const width = 30 + (diskSize * 20);
                    disk.style.width = `${width}px`;
                    disk.style.backgroundColor = `hsl(${diskSize * 40}, 70%, 50%)`;
                    disk.textContent = diskSize;
                    disksContainer.appendChild(disk);
                });
                
                towerEl.appendChild(disksContainer);
                wrapper.appendChild(towerEl);
            });
            
            // Highlight move if applicable
            if (state.move) {
               // Could add visual arrow or highlight
            }
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
        }, this.currentLevel === 'bubble-sort' ? 200 : 100); 
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

    // --- Visualization System ---

    startVisualization(type) {
        this.resetAll();
        this.elements.visualizationArea.classList.add('active');
        this.vizState.algorithm = type;
        
        let title = "Sorting Visualization";
        if (type === 'bubble') title = "Bubble Sort Visualization";
        if (type === 'insertion') title = "Insertion Sort Visualization";
        if (type === 'merge') title = "Merge Sort Visualization";
        if (type === 'selection') title = "Selection Sort Visualization";
        if (type === 'quick') title = "Quick Sort Visualization";
        if (type === 'heap') title = "Heap Sort Visualization";
        if (type === 'shell') title = "Shell Sort Visualization";
        if (type === 'cocktail') title = "Cocktail Shaker Sort Visualization";
        if (type === 'radix') title = "Radix Sort Visualization";
        
        this.elements.vizTitle.textContent = title;
        this.shuffleViz();
    }

    shuffleViz() {
        if (this.vizState.abortController) this.vizState.abortController.abort();
        this.vizState.running = false;
        
        // Generate array
        const count = parseInt(this.elements.vizSize.value);
        // Linear array 1 to count
        this.vizState.array = Array.from({length: count}, (_, i) => i + 1);
        
        // Fisher-Yates Shuffle
        for (let i = this.vizState.array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.vizState.array[i], this.vizState.array[j]] = [this.vizState.array[j], this.vizState.array[i]];
        }
        
        this.renderVizFrame();
    }

    renderVizFrame(highlightIndices = [], sortedIndices = []) {
        const wrapper = this.elements.vizCanvas;
        wrapper.innerHTML = '';
        
        const count = this.vizState.array.length;
        const maxVal = Math.max(...this.vizState.array);
        
        this.vizState.array.forEach((val, idx) => {
            const bar = document.createElement('div');
            // Calculate width to fill container minus gaps
            // Gap is 1px on each side (2px total per bar) if possible, or adjust
            // Let's use flex-grow or percentage width
            bar.style.width = `${100/count}%`; 
            bar.style.height = `${(val / maxVal) * 100}%`;
            bar.style.backgroundColor = '#444';
            bar.style.margin = '0 1px'; // Keep small gap
            if (count > 60) bar.style.margin = '0'; // Remove gap for large datasets
            bar.style.borderRadius = '2px 2px 0 0';
            
            if (sortedIndices.includes(idx)) {
                bar.style.backgroundColor = '#00ff00';
            }
            // Highlight overrides sorted
            if (highlightIndices.includes(idx)) {
                bar.style.backgroundColor = '#00ffff';
            }
            
            wrapper.appendChild(bar);
        });
    }

    async vizSweep(signal) {
        const arr = this.vizState.array;
        const n = arr.length;
        const delay = Math.max(10, 2000 / n); // 2s max total sweep time

        for (let i = 0; i < n; i++) {
             if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
             // All green, current one cyan
             this.renderVizFrame([i], Array.from({length: n}, (_, k) => k)); 
             this.playSound(arr[i]);
             await new Promise(r => setTimeout(r, delay));
        }
        // Final state: all green
        this.renderVizFrame([], Array.from({length: n}, (_, k) => k)); 
    }

    async runViz() {
        if (this.vizState.running) return;
        this.vizState.running = true;
        this.vizState.abortController = new AbortController();
        const signal = this.vizState.abortController.signal;
        
        // Init Audio
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }

        try {
            if (this.vizState.algorithm === 'bubble') await this.vizBubbleSort(signal);
            if (this.vizState.algorithm === 'insertion') await this.vizInsertionSort(signal);
            if (this.vizState.algorithm === 'merge') await this.vizMergeSort(signal);
            if (this.vizState.algorithm === 'selection') await this.vizSelectionSort(signal);
            if (this.vizState.algorithm === 'quick') await this.vizQuickSort(signal);
            if (this.vizState.algorithm === 'heap') await this.vizHeapSort(signal);
            if (this.vizState.algorithm === 'shell') await this.vizShellSort(signal);
            if (this.vizState.algorithm === 'cocktail') await this.vizCocktailShakerSort(signal);
            if (this.vizState.algorithm === 'radix') await this.vizRadixSort(signal);
        } catch (e) {
            if (e.name !== 'AbortError') console.error(e);
        }
        
        this.vizState.running = false;
    }

    async vizDelay() {
        const speed = 101 - this.elements.vizSpeed.value; // 1 to 100 -> 100ms to 1ms
        return new Promise(resolve => setTimeout(resolve, speed * 2));
    }

    playSound(value) {
        if (!this.audioCtx) return;
        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();
        
        // Linear frequency mapping from 120Hz to 1200Hz
        // This ensures every value has a unique frequency regardless of size
        const maxVal = this.vizState.array.length || 100;
        const minFreq = 120;
        const maxFreq = 1200;
        
        const freq = minFreq + ((value - 1) / (maxVal - 1 || 1)) * (maxFreq - minFreq);
        
        osc.type = 'sine'; // Sine is cleanest
        osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
        
        gain.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
        
        osc.connect(gain);
        gain.connect(this.audioCtx.destination);
        
        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.1);
    }

    // Algos
    async vizBubbleSort(signal) {
        const arr = this.vizState.array;
        const n = arr.length;
        
        for(let i=0; i<n; i++) {
            for(let j=0; j<n-i-1; j++) {
                if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                
                this.renderVizFrame([j, j+1]);
                this.playSound(arr[j]);
                await this.vizDelay();
                
                if (arr[j] > arr[j+1]) {
                    [arr[j], arr[j+1]] = [arr[j+1], arr[j]];
                    this.renderVizFrame([j, j+1]);
                    this.playSound(arr[j+1]); // High pitch for swap
                    await this.vizDelay();
                }
            }
        }
        await this.vizSweep(signal);
    }

    async vizInsertionSort(signal) {
        const arr = this.vizState.array;
        const n = arr.length;
        
        for (let i = 1; i < n; i++) {
            let key = arr[i];
            let j = i - 1;
            
            while (j >= 0 && arr[j] > key) {
                if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                
                arr[j + 1] = arr[j];
                this.renderVizFrame([j, j+1]);
                this.playSound(arr[j]);
                await this.vizDelay();
                j = j - 1;
            }
            arr[j + 1] = key;
            this.renderVizFrame([j+1]);
            this.playSound(key);
            await this.vizDelay();
        }
        await this.vizSweep(signal);
    }

    async vizMergeSort(signal) {
        const arr = this.vizState.array;
        await this.vizMergeSortHelper(arr, 0, arr.length - 1, signal);
        await this.vizSweep(signal);
    }

    async vizMergeSortHelper(arr, l, r, signal) {
        if (l >= r) return;
        
        const m = l + Math.floor((r - l) / 2);
        await this.vizMergeSortHelper(arr, l, m, signal);
        await this.vizMergeSortHelper(arr, m + 1, r, signal);
        await this.vizMerge(arr, l, m, r, signal);
    }

    async vizMerge(arr, l, m, r, signal) {
        const n1 = m - l + 1;
        const n2 = r - m;
        const L = new Array(n1);
        const R = new Array(n2);

        for (let i = 0; i < n1; i++) L[i] = arr[l + i];
        for (let j = 0; j < n2; j++) R[j] = arr[m + 1 + j];

        let i = 0, j = 0, k = l;

        while (i < n1 && j < n2) {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            
            this.renderVizFrame([k]); // Highlight current position
            this.playSound(arr[k]);
            await this.vizDelay();

            if (L[i] <= R[j]) {
                arr[k] = L[i];
                i++;
            } else {
                arr[k] = R[j];
                j++;
            }
            k++;
            this.renderVizFrame([k-1]); 
            await this.vizDelay();
        }

        while (i < n1) {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            arr[k] = L[i];
            i++;
            k++;
            this.renderVizFrame([k-1]);
            await this.vizDelay();
        }

        while (j < n2) {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            arr[k] = R[j];
            j++;
            k++;
            this.renderVizFrame([k-1]);
            await this.vizDelay();
        }
    }

    async vizSelectionSort(signal) {
        const arr = this.vizState.array;
        const n = arr.length;
        
        for (let i = 0; i < n; i++) {
            let minIdx = i;
            for (let j = i + 1; j < n; j++) {
                if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                
                this.renderVizFrame([i, j, minIdx]);
                this.playSound(arr[j]);
                await this.vizDelay();
                
                if (arr[j] < arr[minIdx]) {
                    minIdx = j;
                }
            }
            if (minIdx !== i) {
                [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
                this.renderVizFrame([i, minIdx]);
                this.playSound(arr[i]);
                await this.vizDelay();
            }
        }
        await this.vizSweep(signal);
    }

    async vizQuickSort(signal) {
        const arr = this.vizState.array;
        await this.vizQuickSortHelper(arr, 0, arr.length - 1, signal);
        await this.vizSweep(signal);
    }

    async vizQuickSortHelper(arr, low, high, signal) {
        if (low < high) {
            const pi = await this.vizPartition(arr, low, high, signal);
            await this.vizQuickSortHelper(arr, low, pi - 1, signal);
            await this.vizQuickSortHelper(arr, pi + 1, high, signal);
        }
    }

    async vizPartition(arr, low, high, signal) {
        const pivot = arr[high];
        let i = (low - 1);
        
        for (let j = low; j <= high - 1; j++) {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            
            this.renderVizFrame([j, high, i + 1]);
            this.playSound(arr[j]);
            await this.vizDelay();
            
            if (arr[j] < pivot) {
                i++;
                [arr[i], arr[j]] = [arr[j], arr[i]];
                this.renderVizFrame([i, j]);
                this.playSound(arr[i]);
                await this.vizDelay();
            }
        }
        [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
        this.renderVizFrame([i + 1, high]);
        this.playSound(arr[i+1]);
        await this.vizDelay();
        return (i + 1);
    }

    async vizHeapSort(signal) {
        const arr = this.vizState.array;
        const n = arr.length;

        for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
            await this.vizHeapify(arr, n, i, signal);
        }

        for (let i = n - 1; i > 0; i--) {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            
            [arr[0], arr[i]] = [arr[i], arr[0]];
            this.renderVizFrame([0, i]);
            this.playSound(arr[i]);
            await this.vizDelay();
            
            await this.vizHeapify(arr, i, 0, signal);
        }
        await this.vizSweep(signal);
    }

    async vizHeapify(arr, n, i, signal) {
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        
        let largest = i;
        let left = 2 * i + 1;
        let right = 2 * i + 2;

        if (left < n && arr[left] > arr[largest]) largest = left;
        if (right < n && arr[right] > arr[largest]) largest = right;

        this.renderVizFrame([i, left < n ? left : i, right < n ? right : i]);
        this.playSound(arr[i]);
        await this.vizDelay();

        if (largest !== i) {
            [arr[i], arr[largest]] = [arr[largest], arr[i]];
            this.renderVizFrame([i, largest]);
            this.playSound(arr[i]);
            await this.vizDelay();
            
            await this.vizHeapify(arr, n, largest, signal);
        }
    }

    async vizShellSort(signal) {
        const arr = this.vizState.array;
        const n = arr.length;
        
        for (let gap = Math.floor(n/2); gap > 0; gap = Math.floor(gap/2)) {
            for (let i = gap; i < n; i++) {
                let temp = arr[i];
                let j;
                for (j = i; j >= gap && arr[j - gap] > temp; j -= gap) {
                    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                    
                    arr[j] = arr[j - gap];
                    this.renderVizFrame([j, j-gap]);
                    this.playSound(arr[j]);
                    await this.vizDelay();
                }
                arr[j] = temp;
                this.renderVizFrame([j]);
                this.playSound(temp);
                await this.vizDelay();
            }
        }
        await this.vizSweep(signal);
    }

    async vizCocktailShakerSort(signal) {
        const arr = this.vizState.array;
        let swapped = true;
        let start = 0;
        let end = arr.length;

        while (swapped) {
            swapped = false;

            for (let i = start; i < end - 1; ++i) {
                if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                this.renderVizFrame([i, i+1]);
                this.playSound(arr[i]);
                await this.vizDelay();

                if (arr[i] > arr[i + 1]) {
                    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                    swapped = true;
                    this.renderVizFrame([i, i+1]);
                    this.playSound(arr[i+1]);
                    await this.vizDelay();
                }
            }

            if (!swapped) break;
            swapped = false;
            end--;

            for (let i = end - 1; i >= start; i--) {
                if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
                this.renderVizFrame([i, i+1]);
                this.playSound(arr[i]);
                await this.vizDelay();

                if (arr[i] > arr[i + 1]) {
                    [arr[i], arr[i + 1]] = [arr[i + 1], arr[i]];
                    swapped = true;
                    this.renderVizFrame([i, i+1]);
                    this.playSound(arr[i+1]);
                    await this.vizDelay();
                }
            }
            start++;
        }
        await this.vizSweep(signal);
    }

    async vizRadixSort(signal) {
        let arr = this.vizState.array;
        const maxNum = Math.max(...arr);
        
        for (let exp = 1; Math.floor(maxNum / exp) > 0; exp *= 10) {
            await this.vizCountSort(arr, exp, signal);
        }
        await this.vizSweep(signal);
    }

    async vizCountSort(arr, exp, signal) {
        const n = arr.length;
        const output = new Array(n).fill(0);
        const count = new Array(10).fill(0);

        for (let i = 0; i < n; i++) {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            const digit = Math.floor(arr[i] / exp) % 10;
            count[digit]++;
            this.renderVizFrame([i]);
            this.playSound(arr[i]);
            // Small delay for scanning
            await new Promise(r => setTimeout(r, Math.max(1, (101 - this.vizState.speed)/2)));
        }

        for (let i = 1; i < 10; i++) {
            count[i] += count[i - 1];
        }

        // Build output array
        for (let i = n - 1; i >= 0; i--) {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            
            const digit = Math.floor(arr[i] / exp) % 10;
            output[count[digit] - 1] = arr[i];
            count[digit]--;
            
            // Visualizing the placement into 'buckets' isn't easy in place,
            // so we visualize the scan.
            this.renderVizFrame([i]);
            this.playSound(arr[i]);
            await this.vizDelay();
        }

        // Copy back
        for (let i = 0; i < n; i++) {
            if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
            arr[i] = output[i];
            this.renderVizFrame([i]);
            this.playSound(arr[i]);
            await this.vizDelay();
        }
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
        
        let size = 8; // Medium
        if (this.currentDifficulty === 'easy') size = 5;
        if (this.currentDifficulty === 'hard') size = 12;

        const array = Array.from({length: size}, () => Math.floor(Math.random() * 80) + 10);
        
        let inversions = 0;
        const tempArr = [...array];
        for(let i=0; i<size; i++) {
            for(let j=i+1; j<size; j++) {
                if(tempArr[i] > tempArr[j]) inversions++;
            }
        }

        this.gameState = {
            initialArray: [...array],
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
        // Strict layout enforcement
        wrapper.style.display = 'flex';
        wrapper.style.flexDirection = 'row';
        wrapper.style.flexWrap = 'nowrap';
        wrapper.style.alignItems = 'flex-end';
        wrapper.style.alignContent = 'normal'; // Reset from binary search
        
        this.updateStats(`Moves: ${this.gameState.moves} / Optimal: ${this.gameState.optimalMoves}`);

        this.gameState.array.forEach((value, index) => {
            const bar = document.createElement('div');
            bar.className = 'bar';
            if (this.currentDifficulty === 'hard') bar.style.width = '20px'; // thinner
            bar.style.height = `${value * 3}px`;
            
            if (this.gameState.selected === index) {
                bar.classList.add('selected');
            }
            
            const label = document.createElement('div');
            label.className = 'bar-value';
            if (this.currentDifficulty === 'hard') label.style.display = 'none';
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
        
        let size = 15;
        if (this.currentDifficulty === 'easy') size = 10;
        if (this.currentDifficulty === 'hard') size = 30;

        let arr = [];
        let current = 10;
        for(let i=0; i<size; i++) {
            current += Math.floor(Math.random() * 10) + 1;
            arr.push(current);
        }
        
        const targetIndex = Math.floor(Math.random() * size);
        const targetValue = arr[targetIndex];

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
        wrapper.style.display = 'flex'; // Ensure flex
        wrapper.style.alignItems = 'center';
        wrapper.style.flexWrap = 'wrap'; // Ensure wrap
        wrapper.style.alignContent = 'center';

        this.updateStats(`Clicks: ${this.gameState.clicks}`);

        this.gameState.array.forEach((value, index) => {
            const cell = document.createElement('div');
            cell.className = 'array-cell';
            if (this.currentDifficulty === 'hard') cell.style.width = '30px';
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

        // Difficulty scaling for BST
        // Easy: 7 nodes (Depth 3)
        // Medium: 15 nodes (Depth 4)
        // Hard: 31 nodes (Depth 5) - Requires careful rendering
        
        let numNodes = 15;
        if (this.currentDifficulty === 'easy') numNodes = 7;
        if (this.currentDifficulty === 'hard') numNodes = 31;

        // Generate values for complete BST to keep it balanced and easy to render
        const values = [];
        for(let i=0; i<numNodes; i++) values.push(0); // placeholder
        
        // Fill with sorted randoms based on heap indices
        const indicesInOrder = [];
        const traverse = (idx) => {
            if (idx >= numNodes) return;
            traverse(2*idx + 1);
            indicesInOrder.push(idx);
            traverse(2*idx + 2);
        };
        traverse(0);
        
        const sortedValues = Array.from({length: numNodes}, () => Math.floor(Math.random() * 100) + 1).sort((a,b)=>a-b);
        // Ensure distinct (simple attempt)
        for(let i=1; i<numNodes; i++) {
             if (sortedValues[i] <= sortedValues[i-1]) sortedValues[i] = sortedValues[i-1] + 1;
        }
        
        const nodes = [];
        for(let i=0; i<numNodes; i++) nodes.push({});
        
        indicesInOrder.forEach((idx, i) => {
             nodes[idx] = { val: sortedValues[i], id: idx, visited: false };
        });
        
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
        
        const totalNodes = this.gameState.nodes.length;

        this.gameState.nodes.forEach((node, i) => {
            const el = document.createElement('div');
            el.className = 'tree-node';
            if (totalNodes > 15) {
                el.style.width = '30px';
                el.style.height = '30px';
                el.style.fontSize = '10px';
            }
            el.textContent = node.val;
            
            const depth = Math.floor(Math.log2(i + 1));
            const totalInLevel = Math.pow(2, depth);
            const x = ((i - (totalInLevel - 1)) + 0.5) * (100 / totalInLevel);
            // Compress height for Hard mode
            const y = depth * (totalNodes > 15 ? 60 : 80) + 40;
            
            el.style.left = `calc(${x}% - ${totalNodes > 15 ? 15 : 25}px)`;
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
                
                const isChild = (i === leftChild || i === rightChild);
                const isCurrentAndTarget = (i === this.gameState.currentIdx && node.val === this.gameState.target);

                if (isChild || isCurrentAndTarget) {
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
        if (index !== this.gameState.currentIdx) {
            this.gameState.moves++;
            this.gameState.path.push(index);
            this.gameState.currentIdx = index;
        }
        
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

        let rows = 10, cols = 10;
        let wallCount = 25;
        
        if (this.currentDifficulty === 'easy') { rows = 6; cols = 6; wallCount = 8; }
        if (this.currentDifficulty === 'hard') { rows = 15; cols = 15; wallCount = 70; }

        const grid = [];
        for(let r=0; r<rows; r++) {
            const row = [];
            for(let c=0; c<cols; c++) {
                row.push({ type: 'empty', visited: false, r, c });
            }
            grid.push(row);
        }
        
        const start = {r: 1, c: 1};
        const end = {r: rows-2, c: cols-2};
        grid[start.r][start.c].type = 'start';
        grid[end.r][end.c].type = 'end';
        grid[start.r][start.c].visited = true;

        for(let i=0; i<wallCount; i++) {
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
        const rows = grid.length;
        const cols = grid[0].length;

        while(q.length > 0) {
            const {r, c, d, path} = q.shift();
            const currentPath = [...path, {r, c}];
            
            if (r === end.r && c === end.c) return { dist: d, path: currentPath };
            
            for(let i=0; i<4; i++) {
                const nr = r + dr[i];
                const nc = c + dc[i];
                
                if (nr>=0 && nr<rows && nc>=0 && nc<cols && 
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
        // Adjust cell size for Hard difficulty
        const cellSize = this.currentDifficulty === 'hard' ? 20 : 30;
        container.style.gridTemplateColumns = `repeat(${this.gameState.cols}, ${cellSize}px)`;

        this.gameState.grid.forEach(row => {
            row.forEach(cell => {
                const el = document.createElement('div');
                el.className = 'grid-cell';
                if (this.currentDifficulty === 'hard') {
                    el.style.width = '20px';
                    el.style.height = '20px';
                    el.style.fontSize = '8px';
                }

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

    // --- Level 5: Dijkstra ---
    initDijkstra() {
        this.elements.levelTitle.textContent = "Dijkstra's Algo";
        this.elements.levelExplanation.innerHTML = `
            <strong>Dijkstra's Algorithm</strong> finds the shortest path in a graph with weighted edges.
            <br>
            It greedily selects the unvisited node with the smallest tentative distance.
            <br>
            Efficiency: <span style="color:#00ff00">O(E + V log V)</span>
            <br>
            <strong>Goal:</strong> Find the path with minimum total cost.
        `;

        let rows = 10, cols = 10;
        let wallCount = 15;
        
        if (this.currentDifficulty === 'easy') { rows = 6; cols = 6; wallCount = 5; }
        if (this.currentDifficulty === 'hard') { rows = 15; cols = 15; wallCount = 40; }

        const grid = [];
        for(let r=0; r<rows; r++) {
            const row = [];
            for(let c=0; c<cols; c++) {
                // Random weights 1-9
                row.push({ type: 'empty', visited: false, r, c, weight: Math.floor(Math.random() * 9) + 1 });
            }
            grid.push(row);
        }
        
        const start = {r: 1, c: 1};
        const end = {r: rows-2, c: cols-2};
        grid[start.r][start.c].type = 'start';
        grid[start.r][start.c].weight = 0; 
        grid[end.r][end.c].type = 'end';
        grid[start.r][start.c].visited = true;

        // Walls
        for(let i=0; i<wallCount; i++) {
            const wr = Math.floor(Math.random()*rows);
            const wc = Math.floor(Math.random()*cols);
            if (grid[wr][wc].type === 'empty') {
                grid[wr][wc].type = 'wall';
            }
        }

        // Calculate optimal
        const steps = this.getDijkstraExpansionOrder(grid, start, end);
        const optimalStep = steps[steps.length - 1];
        const optimalPath = optimalStep ? optimalStep.path : [];
        
        // Calculate optimal cost
        let optimalCost = 0;
        optimalPath.forEach(p => {
             if (p.r !== start.r || p.c !== start.c) {
                 optimalCost += grid[p.r][p.c].weight;
             }
        });

        if (optimalPath.length === 0) {
            this.initDijkstra();
            return;
        }

        this.gameState = {
            grid, rows, cols,
            start, end,
            currentCost: 0,
            optimalCost: optimalCost,
            optimalPath: optimalPath,
            path: [{r: start.r, c: start.c}]
        };

        this.elements.instructions.innerHTML = `Click neighbors to build the cheapest path. Watch the cost!`;
        this.renderDijkstra();
    }

    renderDijkstra() {
        const wrapper = this.elements.canvasWrapper;
        wrapper.innerHTML = '';
        wrapper.style.display = 'block';
        
        const container = document.createElement('div');
        container.className = 'grid-container';
        const cellSize = this.currentDifficulty === 'hard' ? 20 : 30;
        container.style.gridTemplateColumns = `repeat(${this.gameState.cols}, ${cellSize}px)`;

        const currentPathSet = new Set(this.gameState.path.map(p => `${p.r},${p.c}`));
        const lastPos = this.gameState.path[this.gameState.path.length - 1];

        this.gameState.grid.forEach(row => {
            row.forEach(cell => {
                const el = document.createElement('div');
                el.className = 'grid-cell dijkstra';
                if (this.currentDifficulty === 'hard') {
                    el.style.width = '20px';
                    el.style.height = '20px';
                    el.style.fontSize = '8px';
                }
                
                el.textContent = cell.weight;
                
                if (cell.type === 'wall') el.classList.add('wall');
                if (cell.type === 'start') el.classList.add('start');
                if (cell.type === 'end') el.classList.add('end');
                
                if (currentPathSet.has(`${cell.r},${cell.c}`)) {
                    el.classList.add('visited'); 
                    el.style.backgroundColor = '#00ffff';
                    el.style.color = 'black';
                }

                if (!this.playback.active && cell.type !== 'wall' && !currentPathSet.has(`${cell.r},${cell.c}`)) {
                     // Check if neighbor of lastPos
                     if (Math.abs(cell.r - lastPos.r) + Math.abs(cell.c - lastPos.c) === 1) {
                        el.style.cursor = 'pointer';
                        el.style.border = '1px solid #fff';
                        el.onclick = () => this.handleDijkstraClick(cell.r, cell.c);
                     }
                }

                container.appendChild(el);
            });
        });
        
        wrapper.appendChild(container);
        this.updateStats(`Cost: ${this.gameState.currentCost}`);
    }

    handleDijkstraClick(r, c) {
        this.gameState.path.push({r, c});
        this.gameState.currentCost += this.gameState.grid[r][c].weight;
        
        if (r === this.gameState.end.r && c === this.gameState.end.c) {
            this.renderDijkstra();
            
            const accuracy = Math.max(0, Math.round((this.gameState.optimalCost / Math.max(1, this.gameState.currentCost)) * 100));
            
            setTimeout(() => {
                this.showVictory(
                    `Destination Reached!`,
                    `Total Cost: ${this.gameState.currentCost}<br>Optimal Cost: ${this.gameState.optimalCost}<br>Accuracy: <span style="color:${this.getScoreColor(accuracy)}">${accuracy}%</span>`
                );
            }, 500);
        } else {
            this.renderDijkstra();
        }
    }

    // --- Level 6: Tower of Hanoi ---
    initHanoi() {
        this.elements.levelTitle.textContent = "Tower of Hanoi";
        this.elements.instructions.textContent = "Move all disks to the rightmost tower. Smaller disks must always sit on larger ones.";
        this.elements.levelExplanation.innerHTML = `
            <strong>Tower of Hanoi</strong> is a recursive puzzle.
            <br>
            Efficiency: <span style="color:#ff5555">O(2^N)</span>
            <br>
            <strong>Goal:</strong> Move stack from left to right.
        `;

        let numDisks = 4; // Medium
        if (this.currentDifficulty === 'easy') numDisks = 3;
        if (this.currentDifficulty === 'hard') numDisks = 5;

        // Towers array: index 0 (left), 1 (middle), 2 (right)
        // Each tower is a stack (array), last element is top disk
        // Disk values: 1 (smallest) to N (largest)
        const towers = [[], [], []];
        for (let i = numDisks; i >= 1; i--) {
            towers[0].push(i);
        }

        const optimalMoves = Math.pow(2, numDisks) - 1;

        this.gameState = {
            towers: towers,
            numDisks: numDisks,
            moves: 0,
            optimalMoves: optimalMoves,
            selectedTower: null
        };

        this.renderHanoi();
    }

    renderHanoi() {
        const wrapper = this.elements.canvasWrapper;
        wrapper.innerHTML = '';
        wrapper.style.display = 'flex';
        wrapper.style.justifyContent = 'space-around';
        wrapper.style.alignItems = 'flex-end';
        wrapper.style.paddingBottom = '20px'; // Space for base label if any

        this.updateStats(`Moves: ${this.gameState.moves} / Optimal: ${this.gameState.optimalMoves}`);

        this.gameState.towers.forEach((towerStack, towerIndex) => {
            const towerEl = document.createElement('div');
            towerEl.className = 'tower';
            
            // Interaction
            if (!this.playback.active) {
                towerEl.onclick = () => this.handleHanoiClick(towerIndex);
                towerEl.style.cursor = 'pointer';
            }

            if (this.gameState.selectedTower === towerIndex) {
                towerEl.classList.add('selected');
            }

            const pole = document.createElement('div');
            pole.className = 'tower-pole';
            towerEl.appendChild(pole);

            const disksContainer = document.createElement('div');
            disksContainer.className = 'disks-container';

            // Stack is bottom-up, render from bottom (0) to top (length-1)
            // Flex column-reverse handles visual stacking if we append in order
            // But usually standard flex column means first child is top. 
            // Let's use flex-direction: column-reverse in CSS for .disks-container so index 0 is at bottom
            
            towerStack.forEach(diskSize => {
                const disk = document.createElement('div');
                disk.className = 'disk';
                const width = 30 + (diskSize * 20);
                disk.style.width = `${width}px`;
                disk.style.backgroundColor = `hsl(${diskSize * 40}, 70%, 50%)`;
                // disk.textContent = diskSize; // Optional number
                disksContainer.appendChild(disk);
            });

            towerEl.appendChild(disksContainer);
            wrapper.appendChild(towerEl);
        });
    }

    handleHanoiClick(towerIndex) {
        if (this.gameState.selectedTower === null) {
            // Select source if it has disks
            if (this.gameState.towers[towerIndex].length > 0) {
                this.gameState.selectedTower = towerIndex;
                this.renderHanoi();
            }
        } else {
            // Move attempt
            const fromIdx = this.gameState.selectedTower;
            const toIdx = towerIndex;

            if (fromIdx !== toIdx) {
                const sourceStack = this.gameState.towers[fromIdx];
                const destStack = this.gameState.towers[toIdx];
                
                const diskToMove = sourceStack[sourceStack.length - 1];
                const topDestDisk = destStack.length > 0 ? destStack[destStack.length - 1] : Infinity;

                if (diskToMove < topDestDisk) {
                    // Valid move
                    sourceStack.pop();
                    destStack.push(diskToMove);
                    this.gameState.moves++;
                    this.gameState.selectedTower = null;
                    this.checkHanoiWin();
                } else {
                    // Invalid move - deselect or provide feedback
                    this.gameState.selectedTower = null; 
                    // Optional: shake animation
                }
            } else {
                // Deselect
                this.gameState.selectedTower = null;
            }
            this.renderHanoi();
        }
    }

    checkHanoiWin() {
        // Win if all disks are on the last tower (index 2)
        if (this.gameState.towers[2].length === this.gameState.numDisks) {
            const accuracy = Math.max(0, Math.round((this.gameState.optimalMoves / Math.max(1, this.gameState.moves)) * 100));
            
            setTimeout(() => {
                this.showVictory(
                    `Tower Completed!`,
                    `Moves: ${this.gameState.moves}<br>Optimal: ${this.gameState.optimalMoves}<br>Accuracy: <span style="color:${this.getScoreColor(accuracy)}">${accuracy}%</span>`
                );
            }, 500);
        }
    }

    getScoreColor(score) {
        if (score >= 90) return '#00ff00';
        if (score >= 70) return '#ffff00';
        return '#ff5555';
    }
}

const game = new DSAGame();
