// Game State
let gameState = {
    eggs: 0,
    eggsPerClick: 1,
    eggsPerSecond: 0,
    upgrades: [],
    autoClickers: []
};

// Upgrade definitions
const upgrades = [
    { id: 'better_food', name: 'Better Bird Food', description: '+1 egg per click', cost: 10, eggsPerClick: 1, emoji: '🌾' },
    { id: 'bird_house', name: 'Bird House', description: '+2 eggs per click', cost: 50, eggsPerClick: 2, emoji: '🏠' },
    { id: 'bird_feeder', name: 'Premium Feeder', description: '+5 eggs per click', cost: 200, eggsPerClick: 5, emoji: '🍎' },
    { id: 'bird_bath', name: 'Bird Bath', description: '+10 eggs per click', cost: 500, eggsPerClick: 10, emoji: '💧' },
    { id: 'nest_box', name: 'Nest Box', description: '+25 eggs per click', cost: 1500, eggsPerClick: 25, emoji: '📦' },
    { id: 'bird_sanctuary', name: 'Bird Sanctuary', description: '+50 eggs per click', cost: 5000, eggsPerClick: 50, emoji: '🦅' },
    { id: 'bird_kingdom', name: 'Bird Kingdom', description: '+100 eggs per click', cost: 20000, eggsPerClick: 100, emoji: '👑' },
    { id: 'bird_empire', name: 'Bird Empire', description: '+250 eggs per click', cost: 100000, eggsPerClick: 250, emoji: '🏛️' }
];

// Auto-clicker definitions
const autoClickers = [
    { id: 'finch', name: 'Finch', description: '0.5 eggs/sec', cost: 15, eggsPerSecond: 0.5, emoji: '🐦' },
    { id: 'chicken', name: 'Chicken', description: '1 egg/sec', cost: 100, eggsPerSecond: 1, emoji: '🐤' },
    { id: 'parrot', name: 'Parrot', description: '2 eggs/sec', cost: 500, eggsPerSecond: 2, emoji: '🦜' },
    { id: 'eagle', name: 'Eagle', description: '5 eggs/sec', cost: 2000, eggsPerSecond: 5, emoji: '🦅' },
    { id: 'flock', name: 'Bird Flock', description: '10 eggs/sec', cost: 10000, eggsPerSecond: 10, emoji: '🐦‍⬛' },
    { id: 'phoenix', name: 'Phoenix', description: '25 eggs/sec', cost: 50000, eggsPerSecond: 25, emoji: '🔥' },
    { id: 'dragon_bird', name: 'Dragon Bird', description: '50 eggs/sec', cost: 250000, eggsPerSecond: 50, emoji: '🐉' },
    { id: 'legendary_flock', name: 'Legendary Flock', description: '100 eggs/sec', cost: 1000000, eggsPerSecond: 100, emoji: '✨' }
];

// DOM Elements
const eggsElement = document.getElementById('eggs');
const eggsPerClickElement = document.getElementById('eggs-per-click');
const eggsPerSecondElement = document.getElementById('eggs-per-second');
const birdElement = document.getElementById('bird');
const clickEffectElement = document.getElementById('click-effect');
const upgradesListElement = document.getElementById('upgrades-list');
const autoClickersListElement = document.getElementById('auto-clickers-list');
const saveBtn = document.getElementById('save-btn');
const resetBtn = document.getElementById('reset-btn');

// Initialize
loadGame();
renderUpgrades();
renderAutoClickers();
updateUI();
startAutoClicker();

// Event Listeners
birdElement.addEventListener('click', handleClick);
saveBtn.addEventListener('click', saveGame);
resetBtn.addEventListener('click', resetGame);

// Click handler
function handleClick(e) {
    gameState.eggs += gameState.eggsPerClick;
    updateUI();
    renderUpgrades();
    renderAutoClickers();
    
    // Visual feedback
    showClickEffect(e);
    animateBird();
    
    // Save progress
    saveGame();
}

// Show click effect
function showClickEffect(e) {
    const rect = birdElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const effect = document.createElement('div');
    effect.className = 'click-popup';
    effect.textContent = `+${formatNumber(gameState.eggsPerClick)}`;
    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    clickEffectElement.appendChild(effect);
    
    setTimeout(() => {
        effect.remove();
    }, 1000);
}

// Animate bird
function animateBird() {
    birdElement.style.transform = 'scale(0.9)';
    setTimeout(() => {
        birdElement.style.transform = 'scale(1)';
    }, 100);
}

// Render upgrades
function renderUpgrades() {
    upgradesListElement.innerHTML = '';
    upgrades.forEach(upgrade => {
        const owned = gameState.upgrades.filter(u => u.id === upgrade.id).length;
        const canAfford = gameState.eggs >= upgrade.cost;
        
        const upgradeElement = document.createElement('div');
        upgradeElement.className = `upgrade-item ${canAfford ? '' : 'disabled'}`;
        upgradeElement.innerHTML = `
            <div class="upgrade-emoji">${upgrade.emoji}</div>
            <div class="upgrade-info">
                <div class="upgrade-name">${upgrade.name}</div>
                <div class="upgrade-desc">${upgrade.description}</div>
                <div class="upgrade-owned">Owned: ${owned}</div>
            </div>
            <div class="upgrade-cost">${formatNumber(upgrade.cost)} eggs</div>
        `;
        
        // Always add click listener, but check affordability in the handler
        upgradeElement.addEventListener('click', () => {
            if (canAfford) {
                buyUpgrade(upgrade);
            }
        });
        
        upgradesListElement.appendChild(upgradeElement);
    });
}

// Render auto-clickers
function renderAutoClickers() {
    autoClickersListElement.innerHTML = '';
    autoClickers.forEach(clicker => {
        const owned = gameState.autoClickers.filter(c => c.id === clicker.id).length;
        const canAfford = gameState.eggs >= clicker.cost;
        
        const clickerElement = document.createElement('div');
        clickerElement.className = `auto-clicker-item ${canAfford ? '' : 'disabled'}`;
        clickerElement.innerHTML = `
            <div class="clicker-emoji">${clicker.emoji}</div>
            <div class="clicker-info">
                <div class="clicker-name">${clicker.name}</div>
                <div class="clicker-desc">${clicker.description}</div>
                <div class="clicker-owned">Owned: ${owned}</div>
            </div>
            <div class="clicker-cost">${formatNumber(clicker.cost)} eggs</div>
        `;
        
        // Always add click listener, but check affordability in the handler
        clickerElement.addEventListener('click', () => {
            if (canAfford) {
                buyAutoClicker(clicker);
            }
        });
        
        autoClickersListElement.appendChild(clickerElement);
    });
}

// Buy upgrade
function buyUpgrade(upgrade) {
    if (gameState.eggs >= upgrade.cost) {
        gameState.eggs -= upgrade.cost;
        gameState.eggsPerClick += upgrade.eggsPerClick;
        gameState.upgrades.push({ ...upgrade });
        updateUI();
        renderUpgrades();
        saveGame();
    }
}

// Buy auto-clicker
function buyAutoClicker(clicker) {
    if (gameState.eggs >= clicker.cost) {
        gameState.eggs -= clicker.cost;
        gameState.autoClickers.push({ ...clicker });
        updateUI();
        renderAutoClickers();
        saveGame();
    }
}

// Calculate eggs per second from all auto-clickers
function calculateEggsPerSecond() {
    return gameState.autoClickers.reduce((total, clicker) => {
        return total + (clicker.eggsPerSecond || 0);
    }, 0);
}

// Update UI
function updateUI() {
    gameState.eggsPerSecond = calculateEggsPerSecond();
    eggsElement.textContent = formatNumber(gameState.eggs);
    eggsPerClickElement.textContent = formatNumber(gameState.eggsPerClick);
    eggsPerSecondElement.textContent = formatNumber(gameState.eggsPerSecond);
}

// Start auto-clicker
function startAutoClicker() {
    setInterval(() => {
        if (gameState.eggsPerSecond > 0) {
            gameState.eggs += gameState.eggsPerSecond;
            updateUI();
            renderUpgrades();
            renderAutoClickers();
            saveGame();
        }
    }, 1000);
}

// Format number
function formatNumber(num) {
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return Math.floor(num).toLocaleString();
}

// Save game
function saveGame() {
    localStorage.setItem('birdClickerSave', JSON.stringify(gameState));
}

// Load game
function loadGame() {
    const save = localStorage.getItem('birdClickerSave');
    if (save) {
        try {
            const loaded = JSON.parse(save);
            gameState = { ...gameState, ...loaded };
        } catch (e) {
            console.error('Failed to load save:', e);
        }
    }
}

// Reset game
function resetGame() {
    if (confirm('Are you sure you want to reset your progress? This cannot be undone!')) {
        gameState = {
            eggs: 0,
            eggsPerClick: 1,
            eggsPerSecond: 0,
            upgrades: [],
            autoClickers: []
        };
        localStorage.removeItem('birdClickerSave');
        updateUI();
        renderUpgrades();
        renderAutoClickers();
    }
}

// Auto-save every 30 seconds
setInterval(saveGame, 30000);
