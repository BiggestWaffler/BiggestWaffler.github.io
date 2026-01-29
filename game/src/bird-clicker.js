// Game State
let gameState = {
    eggs: 0,
    eggsPerClick: 1,
    eggsPerSecond: 0,
    upgrades: [],
    autoClickers: [],
    // Rebirth system
    feathers: 0,
    totalEggsEarned: 0,
    rebirthCount: 0,
    ancients: {},
    // Golden egg system
    goldenEggs: 0,
    goldenEggBuffs: {
        autoClicker: 0,  // Number of auto-clicker buffs active
        goldenLuck: 0    // Level of golden luck buff
    }
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

// Golden egg buff definitions
const goldenEggBuffs = [
    {
        id: 'autoClicker',
        name: 'Golden Auto-Clicker',
        description: 'Clicks 1 time per second',
        cost: 1,
        emoji: '🤖',
        type: 'stackable' // Can buy multiple
    },
    {
        id: 'goldenLuck',
        name: 'Golden Luck',
        description: '+0.1% golden egg drop chance per level',
        cost: 1,
        emoji: '🍀',
        type: 'upgradeable' // Levels up
    }
];

// Ancient definitions (permanent upgrades)
const ancients = [
    { 
        id: 'click_power', 
        name: 'Click Power', 
        description: '+10% eggs per click per level', 
        baseCost: 1, 
        costMultiplier: 1.5,
        effect: (level) => 1 + (level * 0.1),
        emoji: '👆'
    },
    { 
        id: 'auto_click_power', 
        name: 'Auto Click Power', 
        description: '+10% eggs per second per level', 
        baseCost: 1, 
        costMultiplier: 1.5,
        effect: (level) => 1 + (level * 0.1),
        emoji: '⚡'
    },
    { 
        id: 'egg_value', 
        name: 'Egg Value', 
        description: '+5% egg production per level', 
        baseCost: 2, 
        costMultiplier: 1.5,
        effect: (level) => 1 + (level * 0.05),
        emoji: '💎'
    },
    { 
        id: 'rebirth_bonus', 
        name: 'Rebirth Bonus', 
        description: '+2% feathers per rebirth per level', 
        baseCost: 3, 
        costMultiplier: 1.5,
        effect: (level) => 1 + (level * 0.02),
        emoji: '🔄'
    }
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
const rebirthBtn = document.getElementById('rebirth-btn');
const feathersDisplayElement = document.getElementById('feathers-display');
const rebirthFeathersElement = document.getElementById('rebirth-feathers');
const rebirthCountElement = document.getElementById('rebirth-count');
const ancientsListElement = document.getElementById('ancients-list');
const goldenEggsElement = document.getElementById('golden-eggs');
const goldenEggShopListElement = document.getElementById('golden-egg-shop-list');

// Sidebar tab elements
const sidebarTabButtons = document.querySelectorAll('.sidebar-tab-button');
const sidebarTabPanels = document.querySelectorAll('.tab-panel');

// Initialize
loadGame();
renderUpgrades();
renderAutoClickers();
renderAncients();
renderGoldenEggShop();
updateUI();
startAutoClicker();
startGoldenAutoClicker();

// Event Listeners
birdElement.addEventListener('click', handleClick);
saveBtn.addEventListener('click', saveGame);
resetBtn.addEventListener('click', resetGame);
if (rebirthBtn) rebirthBtn.addEventListener('click', performRebirth);

// Sidebar tab switching
sidebarTabButtons.forEach(button => {
    button.addEventListener('click', () => {
        const target = button.getAttribute('data-tab-target');
        if (!target) return;

        // Update button active states
        sidebarTabButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        // Update panel visibility
        sidebarTabPanels.forEach(panel => {
            if (panel.getAttribute('data-tab') === target) {
                panel.classList.add('active');
            } else {
                panel.classList.remove('active');
            }
        });
    });
});

// Click handler
function handleClick(e) {
    const baseEggsPerClick = gameState.eggsPerClick;
    const ancientBonus = getAncientBonus('click_power');
    const actualEggsPerClick = Math.floor(baseEggsPerClick * ancientBonus);
    
    gameState.eggs += actualEggsPerClick;
    gameState.totalEggsEarned += actualEggsPerClick;
    
    // Check for golden egg drop (1/1000 base chance, modified by golden luck)
    checkGoldenEggDrop(e);
    
    updateUI();
    renderUpgrades();
    renderAutoClickers();
    
    // Visual feedback
    showClickEffect(e, actualEggsPerClick);
    animateBird();
    
    // Save progress
    saveGame();
}

// Check for golden egg drop
function checkGoldenEggDrop(e) {
    const totalChance = calculateGoldenEggChance();
    
    if (Math.random() < totalChance) {
        gameState.goldenEggs += 1;
        showGoldenEggEffect(e);
        updateUI();
        renderGoldenEggShop();
    }
}

// Calculate total golden egg drop chance
function calculateGoldenEggChance() {
    const baseChance = 0.001; // 1/1000 chance of golden egg drop
    const goldenLuckBonus = gameState.goldenEggBuffs.goldenLuck * 0.001; // +0.1% per level
    return baseChance + goldenLuckBonus;
}

// Show golden egg drop effect
function showGoldenEggEffect(e) {
    const rect = birdElement.getBoundingClientRect();
    let x, y;
    
    if (e.clientX && e.clientY) {
        // From mouse event
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    } else {
        // From auto-clicker (center of bird)
        x = rect.width / 2;
        y = rect.height / 2;
    }
    
    const effect = document.createElement('div');
    effect.className = 'golden-egg-popup';
    effect.textContent = '🥚 GOLDEN EGG!';
    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    clickEffectElement.appendChild(effect);
    
    setTimeout(() => {
        effect.remove();
    }, 2000);
}

// Show click effect
function showClickEffect(e, amount) {
    const rect = birdElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const effect = document.createElement('div');
    effect.className = 'click-popup';
    effect.textContent = `+${formatNumber(amount)}`;
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
    const baseEps = gameState.autoClickers.reduce((total, clicker) => {
        return total + (clicker.eggsPerSecond || 0);
    }, 0);
    const ancientBonus = getAncientBonus('auto_click_power') * getAncientBonus('egg_value');
    return Math.floor(baseEps * ancientBonus);
}

// Update UI
function updateUI() {
    gameState.eggsPerSecond = calculateEggsPerSecond();
    eggsElement.textContent = formatNumber(gameState.eggs);
    
    const baseEpc = gameState.eggsPerClick;
    const clickPowerBonus = getAncientBonus('click_power');
    const eggValueBonus = getAncientBonus('egg_value');
    const actualEpc = Math.floor(baseEpc * clickPowerBonus * eggValueBonus);
    eggsPerClickElement.textContent = formatNumber(actualEpc);
    
    eggsPerSecondElement.textContent = formatNumber(gameState.eggsPerSecond);
    
    // Update rebirth UI
    if (feathersDisplayElement) {
        feathersDisplayElement.textContent = formatNumber(gameState.feathers);
    }
    if (rebirthFeathersElement) {
        const feathersGained = calculateRebirthFeathers();
        rebirthFeathersElement.textContent = formatNumber(feathersGained);
    }
    if (rebirthCountElement) {
        rebirthCountElement.textContent = formatNumber(gameState.rebirthCount);
    }
    // Update golden eggs display in shop
    if (goldenEggsElement) {
        goldenEggsElement.textContent = formatNumber(gameState.goldenEggs);
    }
}

// Start auto-clicker
function startAutoClicker() {
    setInterval(() => {
        if (gameState.eggsPerSecond > 0) {
            gameState.eggs += gameState.eggsPerSecond;
            gameState.totalEggsEarned += gameState.eggsPerSecond;
            updateUI();
            renderUpgrades();
            renderAutoClickers();
            saveGame();
        }
    }, 1000);
}

// Start golden auto-clicker (clicks 1 time per second)
function startGoldenAutoClicker() {
    setInterval(() => {
        if (gameState.goldenEggBuffs.autoClicker > 0) {
            // Calculate actual eggs per click with all bonuses
            const baseEpc = gameState.eggsPerClick;
            const clickPowerBonus = getAncientBonus('click_power');
            const eggValueBonus = getAncientBonus('egg_value');
            const actualEggsPerClick = Math.floor(baseEpc * clickPowerBonus * eggValueBonus);
            
            // Total eggs = eggs per click * number of golden auto-clickers
            const totalEggs = actualEggsPerClick * gameState.goldenEggBuffs.autoClicker;
            
            gameState.eggs += totalEggs;
            gameState.totalEggsEarned += totalEggs;
            
            // Show golden click animation
            showGoldenClickEffect(totalEggs);
            
            // Animate bird
            animateBird();
            
            updateUI();
            renderUpgrades();
            renderAutoClickers();
            saveGame();
        }
    }, 1000);
}

// Show golden click effect
function showGoldenClickEffect(amount) {
    const clickAreaRect = clickEffectElement.getBoundingClientRect();
    const birdRect = birdElement.getBoundingClientRect();
    
    // Calculate position relative to click area
    const x = (birdRect.left + birdRect.width / 2) - clickAreaRect.left;
    const y = (birdRect.top + birdRect.height / 2) - clickAreaRect.top;
    
    const effect = document.createElement('div');
    effect.className = 'click-popup golden-click-popup';
    effect.textContent = `+${formatNumber(amount)}`;
    effect.style.left = x + 'px';
    effect.style.top = y + 'px';
    clickEffectElement.appendChild(effect);
    
    setTimeout(() => {
        effect.remove();
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
            // Ensure rebirth fields exist
            if (gameState.feathers === undefined) gameState.feathers = 0;
            if (gameState.totalEggsEarned === undefined) gameState.totalEggsEarned = 0;
            if (gameState.rebirthCount === undefined) gameState.rebirthCount = 0;
            if (!gameState.ancients) gameState.ancients = {};
            // Ensure golden egg fields exist
            if (gameState.goldenEggs === undefined) gameState.goldenEggs = 0;
            if (!gameState.goldenEggBuffs) {
                gameState.goldenEggBuffs = {
                    autoClicker: 0,
                    goldenLuck: 0
                };
            }
            // Migration: Convert old snake_case IDs to camelCase
            if (gameState.goldenEggBuffs.auto_clicker !== undefined) {
                gameState.goldenEggBuffs.autoClicker = gameState.goldenEggBuffs.auto_clicker;
                delete gameState.goldenEggBuffs.auto_clicker;
            }
            if (gameState.goldenEggBuffs.golden_luck !== undefined) {
                gameState.goldenEggBuffs.goldenLuck = gameState.goldenEggBuffs.golden_luck;
                delete gameState.goldenEggBuffs.golden_luck;
            }
        } catch (e) {
            console.error('Failed to load save:', e);
        }
    }
}

// Reset game
function resetGame() {
    if (confirm('Are you sure you want to reset ALL progress including rebirths and golden eggs? This cannot be undone!')) {
        gameState = {
            eggs: 0,
            eggsPerClick: 1,
            eggsPerSecond: 0,
            upgrades: [],
            autoClickers: [],
            feathers: 0,
            totalEggsEarned: 0,
            rebirthCount: 0,
            ancients: {},
            goldenEggs: 0,
            goldenEggBuffs: {
                autoClicker: 0,
                goldenLuck: 0
            }
        };
        localStorage.removeItem('birdClickerSave');
        updateUI();
        renderUpgrades();
        renderAutoClickers();
        renderAncients();
        renderGoldenEggShop();
    }
}

// Get ancient bonus
function getAncientBonus(ancientId) {
    const level = gameState.ancients[ancientId] || 0;
    if (level === 0) return 1;
    const ancient = ancients.find(a => a.id === ancientId);
    return ancient ? ancient.effect(level) : 1;
}

// Calculate rebirth feathers (similar to Clicker Heroes Hero Souls)
function calculateRebirthFeathers() {
    // Base calculation: sqrt(totalEggsEarned / 1e6) * (1 + rebirth bonus)
    const baseFeathers = Math.floor(Math.sqrt(gameState.totalEggsEarned / 1000000));
    const rebirthBonus = getAncientBonus('rebirth_bonus');
    return Math.floor(baseFeathers * rebirthBonus);
}

// Perform rebirth
function performRebirth() {
    const feathersGained = calculateRebirthFeathers();
    
    if (feathersGained < 1) {
        alert('You need to earn at least 1,000,000 total eggs to rebirth!');
        return;
    }
    
    if (!confirm(`Rebirth and gain ${formatNumber(feathersGained)} feathers?\n\nThis will reset your eggs, upgrades, and auto-clickers, but keep your feathers and ancients.`)) {
        return;
    }
    
    // Gain feathers
    gameState.feathers += feathersGained;
    gameState.rebirthCount += 1;
    
    // Reset current run (keep golden eggs and buffs)
    gameState.eggs = 0;
    gameState.eggsPerClick = 1;
    gameState.eggsPerSecond = 0;
    gameState.upgrades = [];
    gameState.autoClickers = [];
    gameState.totalEggsEarned = 0;
    // Note: goldenEggs and goldenEggBuffs persist through rebirth
    
    // Update UI
    updateUI();
    renderUpgrades();
    renderAutoClickers();
    renderAncients();
    renderGoldenEggShop();
    saveGame();
    
    alert(`Rebirth complete! You gained ${formatNumber(feathersGained)} feathers!\n\nTotal Rebirths: ${gameState.rebirthCount}`);
}

// Render ancients
function renderAncients() {
    if (!ancientsListElement) return;
    
    ancientsListElement.innerHTML = '';
    ancients.forEach(ancient => {
        const level = gameState.ancients[ancient.id] || 0;
        const cost = Math.floor(ancient.baseCost * Math.pow(ancient.costMultiplier, level));
        const canAfford = gameState.feathers >= cost;
        
        const ancientElement = document.createElement('div');
        ancientElement.className = `ancient-item ${canAfford ? '' : 'disabled'}`;
        ancientElement.innerHTML = `
            <div class="ancient-emoji">${ancient.emoji}</div>
            <div class="ancient-info">
                <div class="ancient-name">${ancient.name} <span class="ancient-level">Lv. ${level}</span></div>
                <div class="ancient-desc">${ancient.description}</div>
            </div>
            <div class="ancient-cost">${formatNumber(cost)} 🪶</div>
        `;
        
        ancientElement.addEventListener('click', () => {
            if (canAfford) {
                buyAncient(ancient);
            }
        });
        
        ancientsListElement.appendChild(ancientElement);
    });
}

// Buy ancient
function buyAncient(ancient) {
    const level = gameState.ancients[ancient.id] || 0;
    const cost = Math.floor(ancient.baseCost * Math.pow(ancient.costMultiplier, level));
    
    if (gameState.feathers >= cost) {
        gameState.feathers -= cost;
        gameState.ancients[ancient.id] = (gameState.ancients[ancient.id] || 0) + 1;
        updateUI();
        renderAncients();
        renderUpgrades();
        renderAutoClickers();
        saveGame();
    }
}

// Render golden egg shop
function renderGoldenEggShop() {
    if (!goldenEggShopListElement) return;
    
    goldenEggShopListElement.innerHTML = '';
    goldenEggBuffs.forEach(buff => {
        let currentLevel = 0;
        let displayText = '';
        
        if (buff.type === 'stackable') {
            currentLevel = gameState.goldenEggBuffs[buff.id] || 0;
            displayText = `Owned: ${currentLevel}`;
        } else if (buff.type === 'upgradeable') {
            currentLevel = gameState.goldenEggBuffs[buff.id] || 0;
            displayText = `Level: ${currentLevel}`;
            if (currentLevel > 0) {
                const dropChance = calculateGoldenEggChance();
                displayText += ` (${(dropChance * 100).toFixed(2)}% drop chance)`;
            }
        }
        
        const canAfford = gameState.goldenEggs >= buff.cost;
        
        const buffElement = document.createElement('div');
        buffElement.className = `golden-buff-item ${canAfford ? '' : 'disabled'}`;
        buffElement.innerHTML = `
            <div class="golden-buff-emoji">${buff.emoji}</div>
            <div class="golden-buff-info">
                <div class="golden-buff-name">${buff.name}</div>
                <div class="golden-buff-desc">${buff.description}</div>
                <div class="golden-buff-level">${displayText}</div>
            </div>
            <div class="golden-buff-cost">${formatNumber(buff.cost)} 🥚</div>
        `;
        
        buffElement.addEventListener('click', () => {
            if (canAfford) {
                buyGoldenEggBuff(buff);
            }
        });
        
        goldenEggShopListElement.appendChild(buffElement);
    });
}

// Buy golden egg buff
function buyGoldenEggBuff(buff) {
    if (gameState.goldenEggs >= buff.cost) {
        gameState.goldenEggs -= buff.cost;
        
        if (buff.type === 'stackable') {
            gameState.goldenEggBuffs[buff.id] = (gameState.goldenEggBuffs[buff.id] || 0) + 1;
        } else if (buff.type === 'upgradeable') {
            gameState.goldenEggBuffs[buff.id] = (gameState.goldenEggBuffs[buff.id] || 0) + 1;
        }
        
        updateUI();
        renderGoldenEggShop();
        saveGame();
    }
}

// Auto-save every 30 seconds
setInterval(saveGame, 30000);
