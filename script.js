document.addEventListener('DOMContentLoaded', () => {
    // --- 0. Define Mahjong Tiles ---
    const TILE_TYPES = [
        // Manzu (Characters)
        { id: '1m', display: '1m', name: '1 Man' }, { id: '2m', display: '2m', name: '2 Man' }, { id: '3m', display: '3m', name: '3 Man' },
        { id: '4m', display: '4m', name: '4 Man' }, { id: '5m', display: '5m', name: '5 Man' }, { id: '6m', display: '6m', name: '6 Man' },
        { id: '7m', display: '7m', name: '7 Man' }, { id: '8m', display: '8m', name: '8 Man' }, { id: '9m', display: '9m', name: '9 Man' },
        // Pinzu (Circles)
        { id: '1p', display: '1p', name: '1 Pin' }, { id: '2p', display: '2p', name: '2 Pin' }, { id: '3p', display: '3p', name: '3 Pin' },
        { id: '4p', display: '4p', name: '4 Pin' }, { id: '5p', display: '5p', name: '5 Pin' }, { id: '6p', display: '6p', name: '6 Pin' },
        { id: '7p', display: '7p', name: '7 Pin' }, { id: '8p', display: '8p', name: '8 Pin' }, { id: '9p', display: '9p', name: '9 Pin' },
        // Souzu (Bamboo)
        { id: '1s', display: '1s', name: '1 Sou' }, { id: '2s', display: '2s', name: '2 Sou' }, { id: '3s', display: '3s', name: '3 Sou' },
        { id: '4s', display: '4s', name: '4 Sou' }, { id: '5s', display: '5s', name: '5 Sou' }, { id: '6s', display: '6s', name: '6 Sou' },
        { id: '7s', display: '7s', name: '7 Sou' }, { id: '8s', display: '8s', name: '8 Sou' }, { id: '9s', display: '9s', name: '9 Sou' },
        // Winds
        { id: 'ew', display: 'E', name: 'East Wind' }, { id: 'sw', display: 'S', name: 'South Wind' },
        { id: 'ww', display: 'W', name: 'West Wind' }, { id: 'nw', display: 'N', name: 'North Wind' },
        // Dragons
        { id: 'wd', display: 'Wh', name: 'White Dragon' }, { id: 'gd', display: 'Gr', name: 'Green Dragon' }, { id: 'rd', display: 'Rd', name: 'Red Dragon' }
    ];

    // --- 1. Get DOM Elements ---
    const myTurnBtn = document.getElementById('myTurnBtn');
    const othersTurnBtn = document.getElementById('othersTurnBtn');
    const myTurnSection = document.getElementById('myTurnSection');
    const othersTurnSection = document.getElementById('othersTurnSection');

    const discardTrackerGrid = document.getElementById('discardTrackerGrid');
    const drawnTileSelector = document.getElementById('drawnTileSelector');
    const handDisplay = document.getElementById('handDisplay'); // Display area for my hand
    const confirmDrawBtn = document.getElementById('confirmDrawBtn'); // ** NEWLY REFERENCED **
    const discardRecommendationEl = document.getElementById('discardRecommendation'); // ** NEWLY REFERENCED **

    // --- State Variables ---
    const discardedTileCounts = {}; // Tracks discards by OTHERS {tileId: count}
    let myCurrentHand = [];         // Array of tile IDs in my hand, e.g., ['1m', '1m', '2p'] ** NEW **
    let myOwnDiscards = {};         // Counts of tiles I have discarded {tileId: count} ** NEW **


    // --- 2. Tab Switching Logic --- (No changes here)
    function setActiveTab(tabName) {
        if (tabName === 'myTurn') {
            myTurnBtn.classList.add('active');
            othersTurnBtn.classList.remove('active');
            myTurnSection.classList.add('active-content');
            othersTurnSection.classList.remove('active-content');
        } else if (tabName === 'othersTurn') {
            myTurnBtn.classList.remove('active');
            othersTurnBtn.classList.add('active');
            myTurnSection.classList.remove('active-content');
            othersTurnSection.classList.add('active-content');
        }
    }
    myTurnBtn.addEventListener('click', () => setActiveTab('myTurn'));
    othersTurnBtn.addEventListener('click', () => setActiveTab('othersTurn'));
    setActiveTab('myTurn');


    // --- 3. "Other Players' Discards" Grid & Logic ---
    function initializeDiscardTracker() {
        discardTrackerGrid.innerHTML = ''; // Clear existing content
        TILE_TYPES.forEach(tile => { // item will be defined inside this loop for each tile
            discardedTileCounts[tile.id] = 0;

            // 'item' is the main div for this tile tracker entry
            const item = document.createElement('div');
            item.classList.add('tile-tracker-item');
            item.dataset.tileId = tile.id;

            // const representation = document.createElement('span'); // OLD
            // representation.classList.add('tile-representation');   // OLD
            // representation.textContent = tile.display;             // OLD

            // NEW: Create an image element
            const representation = document.createElement('img');
            representation.classList.add('tile-image'); // Add a class for styling
            representation.src = `tiles/${tile.id}.png`; // Assuming png format
            representation.alt = tile.name; // Good for accessibility
            // END NEW

            // MODIFIED FOR LAYOUT
            const countInfo = document.createElement('div');
            countInfo.classList.add('count-info');

            const discardCountLine = document.createElement('div');
            const discardCountSpan = document.createElement('span');
            discardCountSpan.classList.add('discard-count');
            discardCountSpan.textContent = '0';
            discardCountLine.appendChild(discardCountSpan);
            discardCountLine.append(' / 4');

            const inGameLine = document.createElement('div');
            const inGameCountSpan = document.createElement('span');
            inGameCountSpan.classList.add('in-game-count');
            inGameCountSpan.classList.add('bold-count'); // For bolding
            // updateAllInGameCounts (called after this function) will populate its text

            inGameLine.append('In Game: ');
            inGameLine.appendChild(inGameCountSpan);

            countInfo.appendChild(discardCountLine);
            countInfo.appendChild(inGameLine);
            // END MODIFIED FOR LAYOUT

            // THESE LINES MUST BE INSIDE THE forEach LOOP, using the 'item' defined above
            item.appendChild(representation); // This was likely the problematic area
            item.appendChild(countInfo);      // This was likely the problematic area

            item.addEventListener('click', () => handleOtherPlayerDiscardClick(tile.id));
            discardTrackerGrid.appendChild(item); // Append the fully constructed item to the grid
        });
        // updateAllInGameCounts(); // Call this *after* the loop has populated everything
                                // Or, even better, call it once at the end of the main DOMContentLoaded
                                // We already have it there.
    }

    function handleOtherPlayerDiscardClick(tileId) {
        const countInMyHand = myCurrentHand.filter(t => t === tileId).length;
        const countInMyDiscards = myOwnDiscards[tileId] || 0;
        // Maximum number of this tile that *others* could have discarded
        const maxOthersCanDiscard = 4 - countInMyHand - countInMyDiscards;

        if (maxOthersCanDiscard < 0) { // Should not happen with correct logic elsewhere
            console.error(`Error: Max others can discard for ${tileId} is negative.`);
            return; // Or handle appropriately
        }
        
        let currentKnownOthersDiscards = discardedTileCounts[tileId];

        // If maxOthersCanDiscard is 0, they can't discard any, so count should stay 0.
        if (maxOthersCanDiscard === 0) {
            discardedTileCounts[tileId] = 0; // Ensure it's 0 if no tiles are available for others
        } else {
            currentKnownOthersDiscards = (currentKnownOthersDiscards + 1) % (maxOthersCanDiscard + 1);
            // The +1 in modulo is because we want to cycle from 0 up to maxOthersCanDiscard
            // e.g., if maxOthersCanDiscard is 2, cycle is 0, 1, 2, then back to 0 ( (X+1) % 3 )
            discardedTileCounts[tileId] = currentKnownOthersDiscards;
        }
        
        // Update the display for this specific tile in the tracker
        const item = discardTrackerGrid.querySelector(`.tile-tracker-item[data-tile-id="${tileId}"]`);
        if (item) {
            item.querySelector('.discard-count').textContent = discardedTileCounts[tileId]; // Use the updated value
        }
        updateAllInGameCounts(); // Update "in game" count for all tiles
    }


    // --- 4. Populate "Tile I Drew" Selector --- (No changes here)
    function initializeDrawnTileSelector() {
        TILE_TYPES.forEach(tile => {
            const option = document.createElement('option');
            option.value = tile.id;
            option.textContent = tile.name + ` (${tile.display})`;
            drawnTileSelector.appendChild(option);
        });
    }

    // --- 5. My Hand Logic --- ** NEW SECTION / SIGNIFICANTLY EXPANDED **
    function addTileToMyHand(tileId) {
        // A standard hand is 13 tiles. After drawing, it becomes 14 before discarding.
        if (myCurrentHand.length >= 14) {
            alert("Hand is already 14 tiles. You must discard before drawing again.");
            return false;
        }
        // Check if we have 4 of this tile already in hand (shouldn't happen with normal play)
        const countOfThisTileInHand = myCurrentHand.filter(t => t === tileId).length;
        if (countOfThisTileInHand >= 4) {
            alert(`You cannot have more than 4 of the tile ${tileId} in your hand (unless it's part of a Kan you haven't declared). This tool doesn't support undeclared Kans yet.`);
            return false;
        }

        myCurrentHand.push(tileId);
        sortHand(myCurrentHand); // Keep hand sorted
        updateMyHandDisplay();
        updateAllInGameCounts(); // Recalculate available tiles
        getDiscardRecommendation(); // Get new recommendation
        return true;
    }

    function removeTileFromMyHand(tileId) {
        const index = myCurrentHand.indexOf(tileId);
        if (index > -1) {
            myCurrentHand.splice(index, 1); // Remove first occurrence
            
            myOwnDiscards[tileId] = (myOwnDiscards[tileId] || 0) + 1; // Track our own discard

            updateMyHandDisplay();
            updateAllInGameCounts(); // Recalculate available tiles
            discardRecommendationEl.textContent = "--"; // Clear recommendation
            // TODO: Add this discarded tile to a visual list of our own discards on the UI
            return true;
        }
        console.warn(`Tile ${tileId} not found in hand to remove.`);
        return false;
    }

    function updateMyHandDisplay() {
        handDisplay.innerHTML = ''; // Clear current hand display
        myCurrentHand.forEach(tileId => {
            const tileObj = TILE_TYPES.find(t => t.id === tileId);
            if (tileObj) {
                const tileDiv = document.createElement('div');
                tileDiv.classList.add('tile'); // This div will now *contain* the image
                tileDiv.dataset.tileId = tileId;

                // OLD: tileDiv.textContent = tileObj.display;

                // NEW: Create an image element and append it to tileDiv
                const tileImg = document.createElement('img');
                tileImg.classList.add('tile-image-hand'); // Specific class for hand tiles if needed
                tileImg.src = `tiles/${tileObj.id}.png`; // Assuming png format
                tileImg.alt = tileObj.name;
                tileDiv.appendChild(tileImg);
                // END NEW

                tileDiv.addEventListener('click', () => handleMyHandTileClick(tileId));
                handDisplay.appendChild(tileDiv);
            }
        });
    }
    
    // Helper to sort hand - mahjong sort order can be complex, simple alphanumeric for now
    function sortHand(hand) {
        // Basic sort - can be improved for proper mahjong suit order
        hand.sort();
    }

    // --- 6. "Confirm Draw" Button Logic --- ** NEW SECTION **
    if (confirmDrawBtn) {
        confirmDrawBtn.addEventListener('click', () => {
            const selectedTileId = drawnTileSelector.value;
            if (selectedTileId) {
                if (myCurrentHand.length < 13) {
                    alert("Please build your initial 13-tile hand first, or ensure you've discarded to 13 tiles.");
                    // Or, allow adding up to 13 initially
                    addTileToMyHand(selectedTileId);
                    drawnTileSelector.value = ""; // Reset selector
                } else if (myCurrentHand.length === 13) { // Correct state to draw a tile
                    addTileToMyHand(selectedTileId);
                    drawnTileSelector.value = ""; // Reset selector
                } else { // Hand is already 14, should discard
                    alert("You already have 14 tiles. Please discard one by clicking on it in your hand.");
                }
            } else {
                alert("Please select a tile you drew from the dropdown.");
            }
        });
    } else {
        console.error("Confirm Draw Button not found!");
    }


    // --- 7. Clicking a tile in "My Hand" to discard it --- ** NEW SECTION **
    function handleMyHandTileClick(tileId) {
        if (myCurrentHand.length === 14) { // Can only discard if hand is 14 tiles
            const tileName = TILE_TYPES.find(t => t.id === tileId)?.name || tileId;
            if (confirm(`Are you sure you want to discard ${tileName}?`)) {
                removeTileFromMyHand(tileId);
            }
        } else if (myCurrentHand.length < 14 && myCurrentHand.length > 0) {
            // Allow removing tiles if building initial hand or correcting mistake
             const tileName = TILE_TYPES.find(t => t.id === tileId)?.name || tileId;
            if (confirm(`Remove ${tileName} from your hand (current hand size ${myCurrentHand.length})?`)) {
                removeTileFromMyHand(tileId); // Will also update counts and clear recommendation
            }
        } else {
            alert("Your hand is not in a state to discard (should be 14 tiles, or you are building your initial hand).");
        }
    }

    // --- 8. "In Game" Count Logic --- ** SIGNIFICANTLY MODIFIED **
    function updateInGameCountForTile(tileId) {
        const item = discardTrackerGrid.querySelector(`.tile-tracker-item[data-tile-id="${tileId}"]`);
        if (item) {
            const inGameCountSpan = item.querySelector('.in-game-count');
            
            const countInMyHand = myCurrentHand.filter(t => t === tileId).length;
            const countInMyDiscards = myOwnDiscards[tileId] || 0;
            const countInOthersDiscards = discardedTileCounts[tileId] || 0;
            // TODO: Eventually consider visible melds (pons, chis, kans) from all players

            const totalKnown = countInMyHand + countInMyDiscards + countInOthersDiscards;
            const inGame = 4 - totalKnown;
            inGameCountSpan.textContent = Math.max(0, inGame); // Ensure it doesn't go below 0
        }
    }

    function updateAllInGameCounts() {
        TILE_TYPES.forEach(tile => {
            updateInGameCountForTile(tile.id);
        });
    }

    // --- 9. Discard Recommendation Logic --- ** NEW SECTION (Basic Placeholder) **
    function getDiscardRecommendation() {
        if (myCurrentHand.length !== 14) {
            discardRecommendationEl.textContent = "--"; // No recommendation unless hand is 14 tiles
            return;
        }

        // Very, very basic recommendation: discard the first isolated honor/terminal, then first tile.
        // This is a TERRIBLE strategy, just a placeholder.
        let recommendation = null;

        // Prioritize isolated non-valuable honors
        const honors = ['ew', 'sw', 'ww', 'nw', 'wd', 'gd', 'rd'];
        for (const honorId of honors) {
            if (myCurrentHand.includes(honorId) && myCurrentHand.filter(t => t === honorId).length === 1) {
                // Check if it's a valuable honor (seat/round wind, dragon) - for now, treat all as simple discards
                recommendation = honorId;
                break;
            }
        }

        // Then isolated terminals (1s or 9s)
        if (!recommendation) {
            const terminals = ['1m', '9m', '1p', '9p', '1s', '9s'];
            for (const terminalId of terminals) {
                if (myCurrentHand.includes(terminalId) && myCurrentHand.filter(t => t === terminalId).length === 1) {
                    recommendation = terminalId;
                    break;
                }
            }
        }
        
        // If no obvious isolated honor/terminal, recommend the first tile (very naive)
        if (!recommendation && myCurrentHand.length > 0) {
            recommendation = myCurrentHand[0];
        }

        if (recommendation) {
            const tileObj = TILE_TYPES.find(t => t.id === recommendation);
            discardRecommendationEl.textContent = `Consider discarding: ${tileObj ? tileObj.name : recommendation} (${recommendation})`;
        } else {
            discardRecommendationEl.textContent = "No obvious discard / Hand empty or not 14 tiles.";
        }
    }


    // --- Initialize the UI components ---
    initializeDiscardTracker();
    initializeDrawnTileSelector();
    updateAllInGameCounts(); // ** NEW: Initialize all "in game" counts considering empty hand at start **
    updateMyHandDisplay(); // ** NEW: Initialize hand display (will be empty) **
    getDiscardRecommendation(); // ** NEW: Initial call (will show no recommendation) **

    console.log("Mahjong Helper Initialized with My Turn functionalities.");
});