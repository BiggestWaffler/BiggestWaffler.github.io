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
            stats: document.getElementById('stats'),
            victoryModal: document.getElementById('victory-modal'),
            victoryMessage: document.getElementById('victory-message')
        };
    }

    startLevel(levelId) {
        this.currentLevel = levelId;
        this.elements.menu.classList.remove('active');
        this.elements.gameArea.classList.add('active');
        this.elements.victoryModal.classList.remove('open');
        this.elements.canvasWrapper.innerHTML = ''; // Clear previous game
        
        if (levelId === 'bubble-sort') {
            this.initBubbleSort();
        } else if (levelId === 'binary-search') {
            this.initBinarySearch();
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

    showVictory(message) {
        this.elements.victoryMessage.textContent = message;
        this.elements.victoryModal.classList.add('open');
    }

    updateStats(text) {
        this.elements.stats.textContent = text;
    }

    // --- Level 1: Bubble Sort ---
    initBubbleSort() {
        this.elements.levelTitle.textContent = "Bubble Sort";
        this.elements.instructions.textContent = "Click two adjacent bars to swap them if they are in the wrong order (left > right). Sort the array!";
        
        // Generate random array
        const size = 8;
        this.gameState = {
            array: Array.from({length: size}, () => Math.floor(Math.random() * 80) + 10),
            moves: 0,
            selected: null // index of first selected bar
        };

        this.renderBubbleSort();
    }

    renderBubbleSort() {
        const wrapper = this.elements.canvasWrapper;
        wrapper.innerHTML = '';
        this.updateStats(`Moves: ${this.gameState.moves}`);

        this.gameState.array.forEach((value, index) => {
            const bar = document.createElement('div');
            bar.className = 'bar';
            bar.style.height = `${value * 3}px`;
            
            if (this.gameState.selected === index) {
                bar.classList.add('selected');
            }
            
            // Check if sorted (visual feedback)
            // Ideally we check if it's in correct final position, but for now simple feedback
            
            const label = document.createElement('div');
            label.className = 'bar-value';
            label.textContent = value;
            bar.appendChild(label);

            bar.onclick = () => this.handleBubbleSortClick(index);
            wrapper.appendChild(bar);
        });
        
        this.checkBubbleSortWin();
    }

    handleBubbleSortClick(index) {
        if (this.gameState.selected === null) {
            this.gameState.selected = index;
        } else {
            const first = this.gameState.selected;
            const second = index;
            
            // Only allow swapping adjacent
            if (Math.abs(first - second) === 1) {
                // Perform swap
                const temp = this.gameState.array[first];
                this.gameState.array[first] = this.gameState.array[second];
                this.gameState.array[second] = temp;
                this.gameState.moves++;
                this.gameState.selected = null;
            } else if (first === second) {
                this.gameState.selected = null; // Deselect
            } else {
                // Select the new one instead
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
            // Visual flair
            const bars = document.querySelectorAll('.bar');
            bars.forEach(b => b.classList.add('sorted'));
            setTimeout(() => {
                this.showVictory(`Sorted in ${this.gameState.moves} moves!`);
            }, 500);
        }
    }

    // --- Level 2: Binary Search ---
    initBinarySearch() {
        this.elements.levelTitle.textContent = "Binary Search";
        
        // Generate sorted array
        const size = 15;
        let arr = [];
        let current = 10;
        for(let i=0; i<size; i++) {
            current += Math.floor(Math.random() * 10) + 1;
            arr.push(current);
        }
        
        const targetIndex = Math.floor(Math.random() * size);
        const targetValue = arr[targetIndex];

        this.gameState = {
            array: arr,
            target: targetValue,
            clicks: 0,
            low: 0,
            high: size - 1,
            history: [] // Indices clicked
        };
        
        this.elements.instructions.innerHTML = `Find the number <span style="color:#00ffff; font-weight:bold;">${targetValue}</span>. <br>Click the middle element of the search range to narrow it down efficiently.`;

        this.renderBinarySearch();
    }

    renderBinarySearch() {
        const wrapper = this.elements.canvasWrapper;
        wrapper.innerHTML = '';
        wrapper.style.alignItems = 'center'; // Center vertically for this mode
        wrapper.style.flexWrap = 'wrap';
        wrapper.style.alignContent = 'center';

        this.updateStats(`Clicks: ${this.gameState.clicks}`);

        this.gameState.array.forEach((value, index) => {
            const cell = document.createElement('div');
            cell.className = 'array-cell';
            cell.textContent = '?'; // Hidden by default
            
            // If revealed or outside current range, show style
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
                cell.style.opacity = '0.3'; // Dim out of range
            }

            if (inRange && !isRevealed) {
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
            setTimeout(() => {
                this.showVictory(`Found ${value} in ${this.gameState.clicks} clicks!`);
            }, 500);
            return;
        }

        if (value < this.gameState.target) {
            // Target is to the right
            this.gameState.low = index + 1;
        } else {
            // Target is to the left
            this.gameState.high = index - 1;
        }

        this.renderBinarySearch();
    }
}

const game = new DSAGame();

