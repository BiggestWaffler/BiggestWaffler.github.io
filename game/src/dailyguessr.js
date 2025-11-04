// DailyGuessr Game Logic

// ===== CONFIGURATION =====
const GOOGLE_MAPS_API_KEY = 'AIzaSyCs662JIaY8dRTlAkBWEVnp2AFXXlG9jjk'; 

const TOTAL_ROUNDS = 10;
const MAX_POINTS = 10000; // maximum points per round

// Generate random coordinates anywhere on Earth
function generateRandomLocation() {
    // Generate random latitude (-90 to 90)
    const lat = (Math.random() * 180) - 90;
    // Generate random longitude (-180 to 180)
    const lng = (Math.random() * 360) - 180;
    return { lat, lng };
}

// ===== GAME STATE =====
let gameState = {
    currentRound: 0,
    totalScore: 0,
    currentRoundScore: 0,
    currentLocation: null,
    userGuess: null,
    streetViewPanorama: null,
    guessMap: null,
    resultMap: null,
    isStreetViewLocked: false,
    hasGuessed: false,
    guessMarker: null,
    dailyCoords: [] // precomputed daily coordinates for each round
};

// ===== INITIALIZATION =====
function init() {
    // Check if API key is set (DEV ONLY)
    if (GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY' || !GOOGLE_MAPS_API_KEY) {
        const apiWarning = document.getElementById('api-warning');
        if (apiWarning) apiWarning.classList.remove('hidden');
        return;
    }

    // Ensure containers exist and are visible
    const streetview = document.getElementById('streetview');
    const mapContainer = document.getElementById('map-container');
    if (!streetview) {
        console.error('#streetview element not found');
        return;
    }
    
    // Ensure map container is visible before initializing map
    if (mapContainer) {
        mapContainer.classList.remove('hidden');
    }

    // Initialize Street View
    initStreetView();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize map immediately (always visible)
    initGuessMap();
    
    // Start the game
    startNewGame();
}

function initStreetView() {
    const streetViewDiv = document.getElementById('streetview');
    if (!streetViewDiv) {
        console.error('#streetview missing');
        return;
    }
    
    // Create panorama without position - set position only after getPanorama returns OK
    gameState.streetViewPanorama = new google.maps.StreetViewPanorama(streetViewDiv, {
        visible: true,
        pov: { heading: 0, pitch: 0 },
        zoom: 1,
        scrollwheel: true,
        panControl: true,
        enableCloseButton: false,
        linksControl: false,
        addressControl: false,
        fullscreenControl: true,
        zoomControl: true,
        motionTracking: false,
        motionTrackingControl: false
    });
}

function setupEventListeners() {
    // Lock/Unlock Street View button
    document.getElementById('lock-btn').addEventListener('click', toggleStreetViewLock);
    
    // Close Map button (may not exist)
    const closeBtn = document.getElementById('close-map-btn');
    if (closeBtn) closeBtn.addEventListener('click', hideGuessMap);
    
    // Confirm Guess button
    document.getElementById('confirm-guess-btn').addEventListener('click', confirmGuess);
    
    // Next Round button
    document.getElementById('next-round-btn').addEventListener('click', nextRound);
    
    // Close Results button
    document.getElementById('close-results-btn').addEventListener('click', closeResults);
    
    // Share Score button
    const shareBtn = document.getElementById('share-score-btn');
    if (shareBtn) shareBtn.addEventListener('click', shareFinalScore);
}

// ===== GAME FLOW =====
function startNewGame() {
    gameState.currentRound = 0;
    gameState.totalScore = 0;
    gameState.currentRoundScore = 0;
    gameState.hasGuessed = false;
    gameState.dailyCoords = getDailyCoordinates();
    
    // Show map and reset Next Round button
    document.getElementById('map-container').classList.remove('hidden');
    document.getElementById('next-round-btn').disabled = true;
    
    updateUI();
    hideAllModals();
    nextRound();
}

function nextRound() {
    if (gameState.currentRound >= TOTAL_ROUNDS) {
        endGame();
        return;
    }
    
    gameState.currentRound++;
    gameState.userGuess = null;
    gameState.currentRoundScore = 0;
    gameState.hasGuessed = false;
    
    // Reset UI
    document.getElementById('next-round-btn').disabled = true;
    document.getElementById('map-container').classList.remove('hidden');
    document.getElementById('confirm-guess-btn').disabled = true;
    
    // Reset guess map marker
    if (gameState.guessMarker) {
        gameState.guessMarker.setMap(null);
        gameState.guessMarker = null;
    }
    
    // Re-enable map clicks for the new round
    if (gameState.guessMap) {
        google.maps.event.clearListeners(gameState.guessMap, 'click');
        gameState.guessMap.addListener('click', (event) => {
            if (gameState.hasGuessed) return;
            
            if (!gameState.guessMarker) {
                gameState.guessMarker = new google.maps.Marker({
                    position: event.latLng,
                    map: gameState.guessMap,
                    draggable: true,
                    animation: google.maps.Animation.DROP
                });
            } else {
                gameState.guessMarker.setPosition(event.latLng);
            }
            
            gameState.userGuess = {
                lat: event.latLng.lat(),
                lng: event.latLng.lng()
            };
            
            document.getElementById('confirm-guess-btn').disabled = false;
        });
    }
    
    // Find and load the day's predetermined location for this round
    findDailyStreetViewLocation(gameState.currentRound - 1);
    
    updateUI();
}

// Deterministic daily location lookup using precomputed coords
function findDailyStreetViewLocation(roundIndex, retries = 0) {
    const MAX_RETRIES = 25;
    if (retries > MAX_RETRIES) {
        // Fall back to a broader random search to avoid blocking the game
        console.warn('Daily location had no coverage, falling back to random location.');
        findRandomStreetViewLocation();
        return;
    }
    
    const service = new google.maps.StreetViewService();
    const base = gameState.dailyCoords[roundIndex];
    // If for some reason base is missing, fall back deterministically to 0,0
    const baseLat = base?.lat ?? 0;
    const baseLng = base?.lng ?? 0;

    // Add deterministic jitter per retry and escalate the radius to find nearby coverage
    const jitter = seededRandomFrom(`${getEasternDateKey()}|${roundIndex}|${retries}`);
    const lat = clampLat(baseLat + (jitter() - 0.5) * 4); // up to ~±2° jitter
    const lng = normalizeLng(baseLng + (jitter() - 0.5) * 4);
    const searchRadius = Math.min(3000000, 200000 + retries * 150000); // 200 km → up to 3000 km
    
    service.getPanorama({
        location: { lat, lng },
        radius: searchRadius,
        source: google.maps.StreetViewSource.OUTDOOR
    }, (data, status) => {
        if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
            const ll = data.location.latLng;
            gameState.currentLocation = {
                lat: ll.lat(),
                lng: ll.lng(),
                name: 'Random Location'
            };
            loadStreetView(gameState.currentLocation);
        } else {
            findDailyStreetViewLocation(roundIndex, retries + 1);
        }
    });
}

// Fallback random finder used if the daily coordinate is ocean-only
function findRandomStreetViewLocation(retries = 0) {
    const MAX_RETRIES = 30;
    if (retries > MAX_RETRIES) {
        console.error('Random fallback also failed to find Street View coverage.');
        return;
    }
    const service = new google.maps.StreetViewService();
    const lat = (Math.random() * 130) - 60;  // -60..70 favors populated latitudes
    const lng = (Math.random() * 360) - 180;
    const searchRadius = Math.min(3000000, 200000 + retries * 150000);
    service.getPanorama({
        location: { lat, lng },
        radius: searchRadius,
        source: google.maps.StreetViewSource.OUTDOOR
    }, (data, status) => {
        if (status === google.maps.StreetViewStatus.OK && data?.location?.latLng) {
            const ll = data.location.latLng;
            gameState.currentLocation = {
                lat: ll.lat(),
                lng: ll.lng(),
                name: 'Random Location'
            };
            loadStreetView(gameState.currentLocation);
        } else {
            findRandomStreetViewLocation(retries + 1);
        }
    });
}

// ===== DAILY COORDINATES (EST) =====
function getEasternDateKey() {
    const fmt = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/New_York',
        year: 'numeric', month: '2-digit', day: '2-digit'
    });
    // en-CA gives YYYY-MM-DD
    return fmt.format(new Date()).replaceAll('-', '');
}

function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return function() {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return h >>> 0;
    };
}

function mulberry32(a) {
    return function() {
        let t = (a += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function seededRandomFrom(seedStr) {
    const seed = xmur3(seedStr)();
    return mulberry32(seed);
}

function clampLat(lat) {
    return Math.max(-90, Math.min(90, lat));
}
function normalizeLng(lng) {
    let x = lng;
    while (x < -180) x += 360;
    while (x > 180) x -= 360;
    return x;
}

function getDailyCoordinates() {
    const key = getEasternDateKey();
    const rng = seededRandomFrom(`DG|${key}`);
    const coords = [];
    for (let i = 0; i < TOTAL_ROUNDS; i++) {
        // Favor populated latitudes: -60..70 like original
        const lat = -60 + rng() * 130;
        const lng = -180 + rng() * 360;
        coords.push({ lat: clampLat(lat), lng: normalizeLng(lng) });
    }
    return coords;
}

function loadStreetView(location) {
    if (!gameState.streetViewPanorama) {
        console.error('Panorama not initialized');
        return;
    }
    if (!location || location.lat == null || location.lng == null) {
        console.error('Invalid location');
        return;
    }
    
    // Set position only after Street View Service returns OK
    gameState.streetViewPanorama.setPosition({ lat: location.lat, lng: location.lng });
    
    // If the container was hidden or just resized, trigger reflow shortly after
    setTimeout(() => {
        const el = document.getElementById('streetview');
        if (el && el.offsetParent !== null) {
            // Street View listens to resize on window
            google.maps.event.trigger(gameState.streetViewPanorama, 'resize');
        }
    }, 250);
}

// Removed showGuessMap function - map is always visible now

function hideGuessMap() {
    // Hide the map overlay when close button is clicked
    document.getElementById('map-container').classList.add('hidden');
    // Reset guess if user closes map before confirming
    gameState.userGuess = null;
    if (gameState.guessMarker) {
        gameState.guessMarker.setMap(null);
        gameState.guessMarker = null;
    }
    document.getElementById('confirm-guess-btn').disabled = true;
    // Note: User can still click the map overlay to show it again, but we don't have a button for that anymore
}

function initGuessMap() {
    const mapDiv = document.getElementById('map');
    const mapContainer = document.getElementById('map-container');
    
    if (!mapDiv) {
        console.error('#map element not found');
        return;
    }
    
    // Ensure map container is visible before creating map
    if (mapContainer) {
        mapContainer.classList.remove('hidden');
    }
    
    gameState.guessMap = new google.maps.Map(mapDiv, {
        center: { lat: 0, lng: 0 },
        zoom: 2,
        mapTypeId: 'roadmap',
        disableDefaultUI: false,
        streetViewControl: false,
        mapTypeControl: false
    });
    
    // Force resize after map is created
    setTimeout(() => {
        if (gameState.guessMap) {
            google.maps.event.trigger(gameState.guessMap, 'resize');
        }
    }, 100);
    
    gameState.guessMap.addListener('click', (event) => {
        // Only allow clicking if not already guessed
        if (gameState.hasGuessed) return;
        
        if (!gameState.guessMarker) {
            gameState.guessMarker = new google.maps.Marker({
                position: event.latLng,
                map: gameState.guessMap,
                draggable: true,
                animation: google.maps.Animation.DROP
            });
        } else {
            gameState.guessMarker.setPosition(event.latLng);
        }
        
        gameState.userGuess = {
            lat: event.latLng.lat(),
            lng: event.latLng.lng()
        };
        
        document.getElementById('confirm-guess-btn').disabled = false;
    });
}

function confirmGuess() {
    if (!gameState.userGuess) return;
    
    // Prevent multiple guesses in the same round
    if (gameState.hasGuessed) {
        return;
    }
    
    // Calculate distance and score
    const distance = calculateDistance(
        gameState.currentLocation.lat,
        gameState.currentLocation.lng,
        gameState.userGuess.lat,
        gameState.userGuess.lng
    );
    
    const roundScore = calculateScore(distance);
    gameState.currentRoundScore = roundScore;
    gameState.totalScore += roundScore;
    gameState.hasGuessed = true;
    
    // Disable the confirm button and map interactions after guessing
    document.getElementById('confirm-guess-btn').disabled = true;
    if (gameState.guessMap) {
        // Disable map clicks
        google.maps.event.clearListeners(gameState.guessMap, 'click');
    }
    
    // Enable Next Round button
    document.getElementById('next-round-btn').disabled = false;
    
    // Show results
    showResults(distance, roundScore);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calculateScore(distanceKm) {
    if (!isFinite(distanceKm) || distanceKm < 0) return 0;
    // Gentle linear drop up to 1000 km, then harsher exponential falloff.
    const gentleEndKm = 1000;           // boundary of gentle region
    const proportionAtGentleEnd = 0.7;  // 70% of max at 1000 km
    const proportionAt5000Km = 0.05;    // ~5% of max by 5000 km

    if (distanceKm <= gentleEndKm) {
        // Linear interpolation from 100% at 0 km to 70% at 1000 km
        const t = distanceKm / gentleEndKm; // 0..1
        const proportion = 1 - (1 - proportionAtGentleEnd) * t;
        return Math.round(MAX_POINTS * proportion);
    }

    // Exponential tail keeping continuity at 1000 km and targeting ~5% at 5000 km
    const lambda = -Math.log(proportionAt5000Km / proportionAtGentleEnd) / (5000 - gentleEndKm);
    const proportion = proportionAtGentleEnd * Math.exp(-lambda * (distanceKm - gentleEndKm));
    return Math.max(0, Math.round(MAX_POINTS * proportion));
}

function showResults(distance, roundScore) {
    // Update result text
    document.getElementById('your-location').textContent = 
        `${gameState.userGuess.lat.toFixed(4)}, ${gameState.userGuess.lng.toFixed(4)}`;
    document.getElementById('actual-location').textContent = 
        `${gameState.currentLocation.lat.toFixed(4)}, ${gameState.currentLocation.lng.toFixed(4)}`;
    document.getElementById('distance').textContent = 
        `${distance.toFixed(2)} km`;
    document.getElementById('round-score').textContent = roundScore;
    
    // Show result map
    showResultMap();
    
    // Show modal
    document.getElementById('results-modal').classList.remove('hidden');
    
    // Update UI
    updateUI();
}

function showResultMap() {
    const mapDiv = document.getElementById('round-map');
    mapDiv.innerHTML = ''; // Clear previous map
    
    const resultMap = new google.maps.Map(mapDiv, {
        center: gameState.currentLocation,
        zoom: 4,
        mapTypeId: 'roadmap',
        streetViewControl: false,
        mapTypeControl: false
    });
    
    // Actual location marker (green)
    new google.maps.Marker({
        position: gameState.currentLocation,
        map: resultMap,
        title: 'Actual Location',
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#4CAF50',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
        }
    });
    
    // User guess marker (red)
    new google.maps.Marker({
        position: gameState.userGuess,
        map: resultMap,
        title: 'Your Guess',
        icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#F44336',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2
        }
    });
    
    // Draw line between guess and actual location
    const line = new google.maps.Polyline({
        path: [gameState.userGuess, gameState.currentLocation],
        geodesic: true,
        strokeColor: '#FF9800',
        strokeOpacity: 0.8,
        strokeWeight: 2
    });
    line.setMap(resultMap);
    
    // Fit bounds to show both markers
    const bounds = new google.maps.LatLngBounds();
    bounds.extend(gameState.currentLocation);
    bounds.extend(gameState.userGuess);
    resultMap.fitBounds(bounds);
}

function closeResults() {
    document.getElementById('results-modal').classList.add('hidden');
    
    if (gameState.currentRound < TOTAL_ROUNDS) {
        // Next Round button is already visible and enabled (enabled after guessing)
        // No need to change it here
    } else {
        endGame();
    }
}

function endGame() {
    document.getElementById('final-score').textContent = gameState.totalScore;
    document.getElementById('game-over-modal').classList.remove('hidden');
}

function shareFinalScore() {
    const gameUrl = `${window.location.origin}/game/dailyguessr.html`;
    const text = `DailyGuessr\nI scored ${gameState.totalScore} in DailyGuessr! Play: ${gameUrl}`;
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('share-score-btn');
            if (btn) {
                const original = btn.innerHTML;
                btn.innerHTML = '<i class="fa-solid fa-check"></i> Copied!';
                btn.disabled = true;
                setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 1800);
            }
        }).catch(() => {});
    }
}

function hideAllModals() {
    document.getElementById('results-modal').classList.add('hidden');
    document.getElementById('game-over-modal').classList.add('hidden');
}

function toggleStreetViewLock() {
    gameState.isStreetViewLocked = !gameState.isStreetViewLocked;
    const lockBtn = document.getElementById('lock-btn');
    const icon = lockBtn.querySelector('i');
    
    if (gameState.isStreetViewLocked) {
        // Locked: disable interactions
        icon.className = 'fa-solid fa-lock';
        lockBtn.title = 'Unlock Street View (currently locked)';
        if (gameState.streetViewPanorama) {
            gameState.streetViewPanorama.setOptions({
                scrollwheel: false,
                panControl: false,
                linksControl: false,
                clickToGo: false
            });
        }
    } else {
        // Unlocked: enable interactions
        icon.className = 'fa-solid fa-lock-open';
        lockBtn.title = 'Lock Street View (currently unlocked)';
        if (gameState.streetViewPanorama) {
            gameState.streetViewPanorama.setOptions({
                scrollwheel: true,
                panControl: true,
                linksControl: true,
                clickToGo: true
            });
        }
    }
}

function updateUI() {
    document.getElementById('round-number').textContent = gameState.currentRound;
    document.getElementById('total-rounds').textContent = TOTAL_ROUNDS;
    document.getElementById('total-score').textContent = gameState.totalScore;
    document.getElementById('current-round-score').textContent = gameState.currentRoundScore;
}

// ===== LOAD GOOGLE MAPS API =====
function loadGoogleMapsAPI() {
    if (GOOGLE_MAPS_API_KEY === 'YOUR_API_KEY' || !GOOGLE_MAPS_API_KEY) {
        const apiWarning = document.getElementById('api-warning');
        if (apiWarning) apiWarning.classList.remove('hidden');
        return;
    }
    
    // Check if already loaded
    if (window.google?.maps) {
        init();
        return;
    }
    
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places,geometry&callback=initGoogleMaps`;
    script.async = true;
    script.defer = true;
    script.onerror = () => {
        console.error('Failed to load Google Maps JS');
        const apiWarning = document.getElementById('api-warning');
        if (apiWarning) apiWarning.classList.remove('hidden');
    };
    document.head.appendChild(script);
}

// Called by Maps JS when it loads
window.initGoogleMaps = function() {
    try {
        if (typeof google !== 'undefined' && google.maps) {
            init();
        } else {
            const apiWarning = document.getElementById('api-warning');
            if (apiWarning) apiWarning.classList.remove('hidden');
        }
    } catch (e) {
        console.error(e);
        const apiWarning = document.getElementById('api-warning');
        if (apiWarning) apiWarning.classList.remove('hidden');
    }
};

// Called if auth fails (referrer/key/billing)
window.gm_authFailure = function() {
    console.error('Google Maps authentication failed. Check API key, billing, and referrer restrictions.');
    const apiWarning = document.getElementById('api-warning');
    if (apiWarning) apiWarning.classList.remove('hidden');
};

// Start loading API when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadGoogleMapsAPI);
} else {
    loadGoogleMapsAPI();
}


