class DSAGame {
    constructor() {
        this.currentLevel = null;
        this.gameState = {};
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
            btnShowOptimal: document.getElementById('btn-show-optimal')
        };
    }

    startLevel(levelId) {
        this.currentLevel = levelId;
        this.elements.menu.classList.remove('active');
        this.elements.gameArea.classList.add('active');
        this.elements.victoryModal.classList.remove('open');
        this.elements.canvasWrapper.innerHTML = '';
        this.elements.accuracyDisplay.style.display = 'none';
        
        // Reset showing optimal state
        this.showingOptimal = false;
        
        switch(levelId) {
            case 'bubble-sort': this.initBubbleSort(); break;
            case 'binary-search': this.initBinarySearch(); break;
            case 'bst-search': this.initBST(); break;
            case 'bfs-grid': this.initBFS(); break;
        }
    }

    showMenu() {
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
        
        // Show/Hide "View Optimal" button based on level support
        if (this.currentLevel === 'bfs-grid' || this.currentLevel === 'binary-search' || this.currentLevel === 'bst-search') {
             this.elements.btnShowOptimal.style.display = 'inline-block';
        } else {
             this.elements.btnShowOptimal.style.display = 'none';
        }
    }

    showOptimal() {
        this.elements.victoryModal.classList.remove('open');
        this.showingOptimal = true;
        
        if (this.currentLevel === 'bfs-grid') {
            this.renderBFS(true); 
        } else if (this.currentLevel === 'binary-search') {
            this.renderBinarySearch(true);
        } else if (this.currentLevel === 'bst-search') {
            this.renderBST(true);
        }
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
            It's called "Bubble Sort" because smaller elements "bubble" to the top (or larger ones to the end) of the list.
            <br>
            Efficiency: <span style="color:#ff5555">O(N²)</span> - Simple but inefficient for large lists.
            <br>
            <strong>Goal:</strong> Sort the bars by height using the minimum number of swaps (inversions).
        `;
        
        const size = 8;
        const array = Array.from({length: size}, () => Math.floor(Math.random() * 80) + 10);
        
        // Calculate optimal moves (number of inversions)
        let inversions = 0;
        const tempArr = [...array];
        for(let i=0; i<size; i++) {
            for(let j=i+1; j<size; j++) {
                if(tempArr[i] > tempArr[j]) inversions++;
            }
        }

        this.gameState = {
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

            if (!this.showingOptimal) {
                bar.onclick = () => this.handleBubbleSortClick(index);
            }
            wrapper.appendChild(bar);
        });
        
        if (!this.showingOptimal) {
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
            <strong>Binary Search</strong> is an efficient algorithm for finding an item from a <em>sorted</em> list of items.
            <br><br>
            It works by repeatedly dividing in half the portion of the list that could contain the item, until you've narrowed down the possible locations to just one.
            <br>
            Efficiency: <span style="color:#00ff00">O(log N)</span> - Very fast!
            <br>
            <strong>Goal:</strong> Find the target by always choosing the middle element of the remaining range.
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

        // Calculate optimal moves and path
        let optMoves = 0;
        let l = 0, r = size - 1;
        let optimalPath = []; // Indices to click
        
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

    renderBinarySearch(showOptimal = false) {
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

            // In optimal view, reveal optimal path and target
            if (showOptimal) {
                if (this.gameState.optimalPath.includes(index)) {
                     cell.textContent = value;
                     cell.classList.add('checked');
                     cell.style.borderColor = '#ffff00'; // Optimal path color
                     if (value === this.gameState.target) {
                         cell.classList.remove('checked');
                         cell.classList.add('found');
                     }
                } else {
                    cell.style.opacity = '0.3';
                }
            } else {
                // Normal game view
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

                if (inRange && !isRevealed) {
                    cell.onclick = () => this.handleBinarySearchClick(index, value);
                } else {
                    cell.style.cursor = 'default';
                }
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
            A <strong>Binary Search Tree (BST)</strong> is a tree data structure where each node has at most two children.
            <br>
            Property: For any node, all values in the <strong>left</strong> subtree are smaller, and all values in the <strong>right</strong> subtree are larger.
            <br>
            Efficiency: <span style="color:#00ff00">O(h)</span> where h is height (avg O(log N)).
            <br>
            <strong>Goal:</strong> Find the target node by traversing down the tree.
        `;

        // Generate a simple BST
        const values = [50, 25, 75, 12, 37, 62, 87, 6, 18, 31, 43, 55, 68, 81, 93];
        
        const nodes = [];
        values.forEach((v, i) => nodes.push({ val: v, id: i, visited: false }));
        
        const targetIdx = Math.floor(Math.random() * nodes.length);
        const targetVal = nodes[targetIdx].val;

        // Calculate optimal path
        // Root is 0. Move down until target.
        let optimalPath = [];
        let curr = 0;
        while(curr < nodes.length) {
            optimalPath.push(curr);
            if(nodes[curr].val === targetVal) break;
            if(targetVal < nodes[curr].val) {
                curr = 2 * curr + 1; // Left
            } else {
                curr = 2 * curr + 2; // Right
            }
        }
        
        let optimalMoves = optimalPath.length;

        this.gameState = {
            nodes: nodes,
            target: targetVal,
            currentIdx: 0, // start at root
            moves: 0,
            optimalMoves: optimalMoves,
            optimalPath: optimalPath,
            path: [0]
        };
        
        this.elements.instructions.innerHTML = `Locate the value <span style="color:#ff00ff; font-weight:bold;">${targetVal}</span> starting from the root (top).`;
        this.renderBST();
    }

    renderBST(showOptimal = false) {
        const wrapper = this.elements.canvasWrapper;
        wrapper.innerHTML = '';
        wrapper.style.display = 'block'; // Reset flex
        wrapper.style.position = 'relative';

        const container = document.createElement('div');
        container.className = 'tree-container';
        
        // Render links first
        this.gameState.nodes.forEach((node, i) => {
            if (i > 0) {
                const parentIdx = Math.floor((i - 1) / 2);
                this.drawLink(container, parentIdx, i);
            }
        });

        // Render nodes
        this.gameState.nodes.forEach((node, i) => {
            const el = document.createElement('div');
            el.className = 'tree-node';
            el.textContent = node.val;
            
            // Positioning
            const depth = Math.floor(Math.log2(i + 1));
            const levelStart = Math.pow(2, depth) - 1;
            const positionInLevel = i - levelStart;
            const totalInLevel = Math.pow(2, depth);
            const x = (positionInLevel + 0.5) * (100 / totalInLevel);
            const y = depth * 80 + 40;
            
            el.style.left = `calc(${x}% - 25px)`;
            el.style.top = `${y}px`;

            if (showOptimal) {
                if (this.gameState.optimalPath.includes(i)) {
                    el.style.borderColor = '#ffff00'; // Optimal path
                    el.style.borderWidth = '3px';
                    if (node.val === this.gameState.target) {
                        el.classList.add('found');
                    }
                } else {
                    el.style.opacity = '0.3';
                }
            } else {
                // Normal view
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

                // Click handling
                const leftChild = 2 * this.gameState.currentIdx + 1;
                const rightChild = 2 * this.gameState.currentIdx + 2;
                
                if (i === leftChild || i === rightChild) {
                    el.style.cursor = 'pointer';
                    el.onclick = () => this.handleBSTClick(i);
                } else {
                    el.style.cursor = 'default';
                }
                
                if (i === this.gameState.currentIdx && node.val === this.gameState.target) {
                    el.classList.add('found');
                }
            }

            container.appendChild(el);
        });

        wrapper.appendChild(container);
        this.updateStats(`Steps: ${this.gameState.moves}`);
    }

    drawLink(container, parentIdx, childIdx) {
        // Simplified link drawing logic or placeholder
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
            <strong>Breadth-First Search (BFS)</strong> explores a graph layer by layer. It starts at the root (or start node) and explores all neighbors at the present depth before moving to nodes at the next depth level.
            <br>
            Efficiency: <span style="color:#00ff00">O(V + E)</span>.
            <br>
            <strong>Goal:</strong> Find the shortest path from START (Cyan) to END (Magenta) avoiding walls.
        `;

        // Grid 10x10
        const rows = 10, cols = 10;
        const grid = [];
        for(let r=0; r<rows; r++) {
            const row = [];
            for(let c=0; c<cols; c++) {
                row.push({ type: 'empty', visited: false, r, c });
            }
            grid.push(row);
        }
        
        // Start and End
        const start = {r: 1, c: 1};
        const end = {r: 8, c: 8};
        grid[start.r][start.c].type = 'start';
        grid[end.r][end.c].type = 'end';
        grid[start.r][start.c].visited = true;

        // Add some random walls
        for(let i=0; i<25; i++) {
            const wr = Math.floor(Math.random()*rows);
            const wc = Math.floor(Math.random()*cols);
            if (grid[wr][wc].type === 'empty') {
                grid[wr][wc].type = 'wall';
            }
        }
        
        // Ensure path exists
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
            optimalPath: optimal.path, // Array of {r, c}
            userPathLength: 0
        };

        this.elements.instructions.innerHTML = `Click neighbors of the current visited area to expand the search.`;
        this.renderBFS();
    }

    calculateBFS(grid, start, end) {
        // Return dist and path
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

    renderBFS(showOptimal = false) {
        const wrapper = this.elements.canvasWrapper;
        wrapper.innerHTML = '';
        wrapper.style.display = 'block';
        
        const container = document.createElement('div');
        container.className = 'grid-container';
        container.style.gridTemplateColumns = `repeat(${this.gameState.cols}, 30px)`;

        // Create a lookup for optimal path
        const optimalSet = new Set();
        if (showOptimal && this.gameState.optimalPath) {
            this.gameState.optimalPath.forEach(p => optimalSet.add(`${p.r},${p.c}`));
        }

        this.gameState.grid.forEach(row => {
            row.forEach(cell => {
                const el = document.createElement('div');
                el.className = 'grid-cell';
                if (cell.type === 'wall') el.classList.add('wall');
                if (cell.type === 'start') el.classList.add('start');
                if (cell.type === 'end') el.classList.add('end');
                if (cell.visited) el.classList.add('visited');
                
                // Show optimal path overlay
                if (showOptimal && optimalSet.has(`${cell.r},${cell.c}`) && cell.type !== 'start' && cell.type !== 'end') {
                    el.style.backgroundColor = '#ffff00'; // Yellow path
                    el.style.color = 'black';
                    el.textContent = '•';
                }

                // Interaction: click neighbor of visited to expand
                if (!showOptimal && !cell.visited && cell.type !== 'wall') {
                    if (this.isNeighborOfVisited(cell.r, cell.c)) {
                        el.style.cursor = 'pointer';
                        el.style.border = '1px solid #555'; // hint
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
