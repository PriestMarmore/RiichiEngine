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

    const playerWindRadios = document.querySelectorAll('input[name="playerWind"]');

    const drawTileGridDisplay = document.getElementById('drawTileGridDisplay');
    const selectedTileForDrawDisplay = document.getElementById('selectedTileForDraw');

    // --- State Variables ---
    const discardedTileCounts = {}; // Tracks discards by OTHERS {tileId: count}
    let myCurrentHand = [];         // Array of tile IDs in my hand, e.g., ['1m', '1m', '2p'] ** NEW **
    let myOwnDiscards = {};         // Counts of tiles I have discarded {tileId: count} ** NEW **
    let playerSeatWind = 'ew'; // Default to East, matches the 'checked' radio button
    const roundWind = 'ew';    // Hardcoded as East for now, as per your statement
    let tileSelectedForDrawing = null;


    // --- 13.  ---
    function cloneHandMap(handMap) {
        return { ...handMap }; // Shallow copy, sufficient for our frequency map
    }

    function extractMaxMelds(originalHandMap) {
        let handMap = cloneHandMap(originalHandMap);
        let meldCount = 0;
        let tilesProcessedInLoop; // To detect if the loop made any changes

        // Iterate multiple times or until no more melds can be formed,
        // as removing one meld might enable another. 2-3 passes are often enough.
        for (let pass = 0; pass < 3; pass++) {
            tilesProcessedInLoop = false;

            // Prioritize Koutsu (Triplets)
            for (const tileType of TILE_TYPES) { // Iterate in a defined order (e.g., TILE_TYPES order)
                const tileId = tileType.id;
                if (handMap[tileId] >= 3) {
                    meldCount++;
                    handMap[tileId] -= 3;
                    tilesProcessedInLoop = true;
                }
            }

            // Then try to find Shuntsu (Sequences)
            for (const suit of ['m', 'p', 's']) {
                for (let num = 1; num <= 7; num++) { // Sequences can start from 1 up to 7
                    const t1 = num + suit;
                    const t2 = (num + 1) + suit;
                    const t3 = (num + 2) + suit;

                    // Greedily take sequences as long as possible
                    while (handMap[t1] > 0 && handMap[t2] > 0 && handMap[t3] > 0) {
                        meldCount++;
                        handMap[t1]--;
                        handMap[t2]--;
                        handMap[t3]--;
                        tilesProcessedInLoop = true;
                    }
                }
            }
            if (!tilesProcessedInLoop) break; // If a pass makes no changes, no more melds to find
        }

        return { meldCount, remainingHandMap: handMap };
    }

    function extractMaxTaatsus(originalHandMap) {
        let handMap = cloneHandMap(originalHandMap);
        let taatsuCount = 0;
        let tilesProcessedInLoop;

        // Iterate a few times, similar to meld extraction
        for (let pass = 0; pass < 2; pass++) { // Taatsu are simpler, fewer passes needed
            tilesProcessedInLoop = false;

            // Prioritize Pairs as Taatsu (one step from Koutsu)
            for (const tileType of TILE_TYPES) {
                const tileId = tileType.id;
                if (handMap[tileId] >= 2) {
                    taatsuCount++;
                    handMap[tileId] -= 2;
                    tilesProcessedInLoop = true;
                }
            }

            // Then Ryanmen (e.g., 23m waiting for 1m or 4m)
            for (const suit of ['m', 'p', 's']) {
                for (let num = 1; num <= 8; num++) { // Ryanmen can be 12 up to 89
                    const t1 = num + suit;
                    const t2 = (num + 1) + suit;
                    if (num === 9) continue; // No t2 for num=9

                    while (handMap[t1] > 0 && handMap[t2] > 0) {
                        taatsuCount++;
                        handMap[t1]--;
                        handMap[t2]--;
                        tilesProcessedInLoop = true;
                    }
                }
            }
            
            // Then Penchan (e.g., 12m waiting for 3m; 89m waiting for 7m)
            // (Ryanmen logic above partly covers some Penchan if we are not careful, need to be specific)
            // Let's refine: Penchan 12 and 89. Kanchan 1_3.
            for (const suit of ['m', 'p', 's']) {
                // Penchan 1-2
                if (handMap[`1${suit}`] > 0 && handMap[`2${suit}`] > 0) {
                    while (handMap[`1${suit}`] > 0 && handMap[`2${suit}`] > 0) { // check again in while
                        taatsuCount++;
                        handMap[`1${suit}`]--;
                        handMap[`2${suit}`]--;
                        tilesProcessedInLoop = true;
                    }
                }
                // Penchan 8-9
                if (handMap[`8${suit}`] > 0 && handMap[`9${suit}`] > 0) {
                    while (handMap[`8${suit}`] > 0 && handMap[`9${suit}`] > 0) {
                        taatsuCount++;
                        handMap[`8${suit}`]--;
                        handMap[`9${suit}`]--;
                        tilesProcessedInLoop = true;
                    }
                }
            }

            // Then Kanchan (e.g., 24m waiting for 3m)
            for (const suit of ['m', 'p', 's']) {
                for (let num = 1; num <= 7; num++) { // Kanchan can be 1_3 up to 7_9
                    const t1 = num + suit;
                    const t3 = (num + 2) + suit;
                    
                    while (handMap[t1] > 0 && handMap[t3] > 0) {
                        taatsuCount++;
                        handMap[t1]--;
                        handMap[t3]--;
                        tilesProcessedInLoop = true;
                    }
                }
            }
            if (!tilesProcessedInLoop) break;
        }
        // Any remaining single tiles are isolated. We don't explicitly count them here,
        // the shanten formula will implicitly penalize for lack of groups.
        return { taatsuCount, remainingHandMap: handMap };
    }


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
        console.log("Inside addTileToMyHand with tileId:", tileId); // DEBUG LINE

        if (myCurrentHand.length >= 14) {
            alert("Hand is already 14 tiles. You must discard before drawing again.");
            console.log("addTileToMyHand: Hand full (>=14). Length:", myCurrentHand.length); // DEBUG
            return false;
        }
        // ... (any other checks like count of this tile in hand) ...

        myCurrentHand.push(tileId);
        console.log("myCurrentHand after push:", myCurrentHand); // DEBUG LINE
        sortMahjongHand(myCurrentHand);
        updateMyHandDisplay();
        updateAllInGameCounts();
        getDiscardRecommendation();
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
    function getTileSortValue(tileId) {
        const suitOrder = { 'm': 1, 'p': 2, 's': 3, 'w': 4, 'd': 5 }; // w for winds, d for dragons
        const honorOrder = { 'ew': 1, 'sw': 2, 'ww': 3, 'nw': 4, 'wd': 5, 'gd': 6, 'rd': 7 }; // For within honors

        const suit = tileId.slice(-1); // 'm', 'p', 's', or last char of honor ID
        const value = tileId.slice(0, -1); // Number for m,p,s or first char(s) of honor

        if (['m', 'p', 's'].includes(suit)) {
            return suitOrder[suit] * 100 + parseInt(value);
        } else {
            let baseSuitOrder;
            if (['ew', 'sw', 'ww', 'nw'].includes(tileId)) {
                baseSuitOrder = suitOrder['w']; // Winds group
            } else { // Dragons
                baseSuitOrder = suitOrder['d']; // Dragons group
            }
            return baseSuitOrder * 100 + honorOrder[tileId];
        }
    }

    function sortMahjongHand(handArray) {
        handArray.sort((a, b) => getTileSortValue(a) - getTileSortValue(b));
    }

    // --- 6. "Confirm Draw" Button Logic --- ** NEW SECTION **
    if (confirmDrawBtn) {
        confirmDrawBtn.addEventListener('click', () => {
            const selectedTileId = tileSelectedForDrawing; // This is the key variable
            console.log("Confirm Draw clicked. Tile to add:", selectedTileId); // DEBUG LINE

            if (selectedTileId) {
                // Check if addTileToMyHand is even being called
                console.log("Attempting to add to hand:", selectedTileId); // DEBUG LINE
                
                // Your existing logic for hand size checks:
                if (myCurrentHand.length < 13) {
                    // ...
                    addTileToMyHand(selectedTileId); // Call to add
                    // ...
                } else if (myCurrentHand.length === 13) {
                    addTileToMyHand(selectedTileId); // Call to add
                } else {
                    alert("You already have 14 tiles. Please discard one by clicking on it in your hand.");
                }

                // Reset selection after attempting to add
                tileSelectedForDrawing = null;
                const currentlySelectedVisual = drawTileGridDisplay.querySelector('.selected-for-draw');
                if (currentlySelectedVisual) {
                    currentlySelectedVisual.classList.remove('selected-for-draw');
                }
                selectedTileForDrawDisplay.textContent = "";
            } else {
                alert("Please select a tile you drew from the grid.");
                console.log("No tile was selected for drawing."); // DEBUG LINE
            }
        });
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
        discardRecommendationEl.textContent = "--"; // Clear previous recommendation

        if (myCurrentHand.length !== 14) {
            // Only provide recommendations for a 14-tile hand (after drawing, before discarding)
            // You could also show shanten for a 13-tile hand if desired, but discard rec is for 14.
            if (myCurrentHand.length === 13) {
                const currentShanten = calculateOverallShanten(myCurrentHand);
                discardRecommendationEl.textContent = `Current Shanten (13 tiles): ${currentShanten}. Draw a tile.`;
            } else {
                discardRecommendationEl.textContent = "Hand must have 14 tiles for discard recommendation.";
            }
            return;
        }

        let bestDiscardCandidate = null; // The tile ID of the best tile to discard
        let shantenAfterBestDiscard = Infinity; // The shanten of the hand *after* discarding the best candidate
        let ukeireForBestDiscard = -1; // Use -1 to ensure any valid ukeire is better

        const uniqueTilesInHand = [...new Set(myCurrentHand)];

        for (const tileToDiscard of uniqueTilesInHand) {
            const temp13Hand = [...myCurrentHand];
            const indexToRemove = temp13Hand.indexOf(tileToDiscard);
            if (indexToRemove > -1) {
                temp13Hand.splice(indexToRemove, 1);
            } else {
                continue;
            }

            console.log(`--- Testing Discard: ${tileToDiscard} ---`);
            const currentShantenOf13TileHand = calculateOverallShanten(temp13Hand); // This calls your new standard shanten
            console.log(`Hand after discard (${temp13Hand.length} tiles): ${temp13Hand.join(' ')}`);
            console.log(`>>> Calculated Shanten for this 13-tile hand: ${currentShantenOf13TileHand}`);

            let currentUkeireData = { count: 0, tiles: {} };

            if (currentShantenOf13TileHand <= 2) { // Only calculate ukeire for hands close to tenpai (e.g., <= 2 shanten)
                                                // Or adjust this threshold as desired. Ukeire for high shanten is less critical.
                currentUkeireData = calculateUkeire(temp13Hand);
                console.log(`Ukeire: ${currentUkeireData.count}`);
            }


            if (currentShantenOf13TileHand < shantenAfterBestDiscard) {
                shantenAfterBestDiscard = currentShantenOf13TileHand;
                bestDiscardCandidate = tileToDiscard;
                ukeireForBestCandidate = currentUkeireData.count;
                console.log(`New best: Discard ${tileToDiscard}, Shanten: ${shantenAfterBestDiscard}, Ukeire: ${ukeireForBestCandidate}`);
            } else if (currentShantenOf13TileHand === shantenAfterBestDiscard) {
                if (currentUkeireData.count > ukeireForBestCandidate) {
                    bestDiscardCandidate = tileToDiscard;
                    ukeireForBestCandidate = currentUkeireData.count;
                    console.log(`Ukeire tie-break: Discard ${tileToDiscard}, Shanten: ${shantenAfterBestDiscard}, Ukeire: ${ukeireForBestCandidate}`);
                }
                // TODO: Further tie-breaking (e.g. tile safety, value of tiles being kept)
            }
        }
        
        const effectiveShantenOf14TileHand = shantenAfterBestDiscard;

        if (bestDiscardCandidate) {
            const tileObj = TILE_TYPES.find(t => t.id === bestDiscardCandidate);
            const tileDisplayName = tileObj ? `${tileObj.name} (${tileObj.display})` : bestDiscardCandidate;

            let recommendationText = `Shanten: ${effectiveShantenOf14TileHand}. `;
            recommendationText += `Discard: ${tileDisplayName}.`;

            // Only show ukeire if it was calculated and is meaningful (e.g., for low shanten hands)
            // ukeireForBestCandidate is initialized to -1, so >= 0 means it was calculated.
            // We might also only want to show it if shanten is low enough to be actively waiting.
            if (ukeireForBestCandidate >= 0 && effectiveShantenOf14TileHand <= 2) { // Example: Show for 2-shanten or better
                recommendationText += ` (Ukeire: ${ukeireForBestCandidate})`;
                // You could also display the specific useful tiles if calculateUkeire returns them
                // For example, if calculateUkeire returns { count: X, tiles: {'1m': 2, '2p': 4} }
                // const ukeireDetails = calculateUkeire( resulting 13 tile hand ); // if you need the tiles object
                // if (ukeireDetails.tiles && Object.keys(ukeireDetails.tiles).length > 0) {
                //     let usefulTilesStr = Object.entries(ukeireDetails.tiles)
                //                              .map(([id, count]) => `${TILE_TYPES.find(t=>t.id===id).display}(${count})`)
                //                              .join(' ');
                //     recommendationText += ` Waits: ${usefulTilesStr}`;
                // }
            }
            discardRecommendationEl.textContent = recommendationText;

        } else if (myCurrentHand.length > 0) {
            // This block is reached if the loop finishes and bestDiscardCandidate is still null.
            // This could happen if:
            // 1. The hand is already a win (shantenAfterBestDiscard would be -1).
            // 2. All shanten calculations resulted in Infinity (e.g., errors in shanten functions).
            // 3. The initial hand was empty or too small for the loop to run (but caught earlier).

            if (effectiveShantenOf14TileHand === -1) {
                // If shanten is -1, it means the hand (after the "best discard", which is the winning tile itself) is complete.
                // We need to identify which tile was the "winning tile" if it was just drawn.
                // This logic might need to be more nuanced based on how -1 shanten is determined.
                // For now, just indicating a completed hand.
                discardRecommendationEl.textContent = `TSUMO! Hand complete. Shanten: -1.`;
                // Ideally, the "discard" would be the tile that was just drawn to complete the hand,
                // but the current loop finds the tile to remove from 14 to *leave* 13 winning tiles.
                // If the 14th tile was the winning one, `bestDiscardCandidate` should correctly be that tile.
            } else if (effectiveShantenOf14TileHand === Infinity) {
                discardRecommendationEl.textContent = "Error: Could not calculate shanten for any discard.";
            } else {
                // This case implies the loop ran but didn't set bestDiscardCandidate,
                // which means shantenAfterBestDiscard might still be Infinity.
                // Or, if all options had equal shanten and equal ukeire (and no further tie-breaking).
                // For a 14-tile hand, there should always be *a* tile to discard.
                // If this happens, it's likely an edge case in the logic or shanten calcs.
                discardRecommendationEl.textContent = `Shanten: ${effectiveShantenOf14TileHand}. No single best discard determined (may need more tie-breakers or check logic).`;
            }
        } else {
            // This case (myCurrentHand.length === 0) should have been caught by the initial check
            // in getDiscardRecommendation.
            discardRecommendationEl.textContent = "Hand empty.";
        }
    }


    // --- 10. Wind ---
    function updatePlayerSeatWind() {
        const selectedRadio = document.querySelector('input[name="playerWind"]:checked');
        if (selectedRadio) {
            playerSeatWind = selectedRadio.value;
            console.log("Player seat wind updated to:", playerSeatWind);
            // If a hand exists, we might want to re-evaluate recommendations
            if (myCurrentHand.length === 14) {
                getDiscardRecommendation();
            }
        }
    }

    playerWindRadios.forEach(radio => {
        radio.addEventListener('change', updatePlayerSeatWind);
    });

    // --- 11. Draw Tiles ---
    function initializeDrawTileGrid() {
        drawTileGridDisplay.innerHTML = '';
        TILE_TYPES.forEach(tile => {
            const tileDiv = document.createElement('div');
            tileDiv.classList.add('tile-selectable');
            tileDiv.dataset.tileId = tile.id;

            const tileImg = document.createElement('img');
            tileImg.src = `tiles/${tile.id}.png`;
            tileImg.alt = tile.name;
            tileDiv.appendChild(tileImg);
            
            // Maybe add tile name text below image if small
            // const tileNameText = document.createElement('span');
            // tileNameText.textContent = tile.display; // or tile.name for full name
            // tileNameText.style.fontSize = "0.7em";
            // tileDiv.appendChild(tileNameText);


            tileDiv.addEventListener('click', () => {
                // Remove 'selected' class from previously selected tile
                const previouslySelected = drawTileGridDisplay.querySelector('.selected-for-draw');
                if (previouslySelected) {
                    previouslySelected.classList.remove('selected-for-draw');
                }

                // Add 'selected' class to current tile and update state
                tileDiv.classList.add('selected-for-draw');
                tileSelectedForDrawing = tile.id;
                selectedTileForDrawDisplay.textContent = `Selected: ${tile.name} (${tile.display})`;
                console.log("Tile selected for drawing:", tileSelectedForDrawing); // DEBUG LINE
            });
            drawTileGridDisplay.appendChild(tileDiv);
        });
    }


    // --- 12. Engine ---
    function getHandFrequencyMap(handArray) {
        const map = {};
        TILE_TYPES.forEach(tile => map[tile.id] = 0); // Initialize all tile counts to 0
        handArray.forEach(tileId => {
            if (map.hasOwnProperty(tileId)) {
                map[tileId]++;
            } else {
                // This case should ideally not happen if handArray only contains valid tile IDs
                console.warn(`Unknown tileId in hand: ${tileId}`);
                map[tileId] = 1; 
            }
        });
        return map;
    }

    // Shanten for Seven Pairs (Chiitoitsu)
    function calculateShanten_Chiitoitsu(handMap, numTilesInHand) {
        if (numTilesInHand !== 13 && numTilesInHand !== 14) return Infinity; // Chiitoitsu needs 13 tiles for tenpai

        let pairCount = 0;
        let quadCount = 0; // 4 identical tiles count as 2 pairs for shanten, but prevent chiitoi win

        for (const tileId in handMap) {
            if (handMap[tileId] >= 2) {
                pairCount++;
            }
            if (handMap[tileId] === 4) { // A quad makes Chiitoi impossible to complete as such
                quadCount++;
            }
        }
        // If hand is 14 tiles, we need to form 7 pairs. If 13, we need 6 pairs + 1 waiting for 7th.
        // Shanten = 6 - number of pairs. If we have 4 of a kind, it complicates things for actual win.
        // For shanten calc: a quad counts as two pairs towards reducing shanten.
        // However, if a quad is present, Chiitoitsu is not a valid yaku with those 4 tiles.
        // For raw shanten, let's count pairs.
        let effectivePairCount = 0;
        for (const tileId in handMap) {
            if (handMap[tileId] >= 2) effectivePairCount++;
            if (handMap[tileId] === 4) effectivePairCount++; // A kong counts as two pairs for shanten
        }

        // Standard Chiitoitsu shanten: 6 - pairs. If 14 tiles, effectively need 7 pairs.
        // A common way is 6 - num_pairs. If we have a 14 tile hand, we are looking to discard one.
        // The shanten of a 13-tile hand is relevant.
        // Let's consider a 13-tile hand for chiitoi shanten. If hand is 14, we'd try removing each tile.
        // For now, if hand has 14 tiles, it's 1-shanten from a 7-pair tenpai if it has 6 pairs + 2 singles.
        
        // Simpler shanten: 6 - (count of tiles that appear >= 2 times)
        // If 4 of a kind, it counts as one pair type, but prevents chiitoi yaku.
        // Let's use the definition from "Riichi Book 1": Shanten = 6 - (number of pairs)
        // If there's a tile present 4 times, it counts as 2 pairs for shanten purposes.
        pairCount = 0;
        let hasQuad = false;
        for (const tileId in handMap) {
            if (handMap[tileId] >= 2) pairCount++;
            if (handMap[tileId] === 4) {
                pairCount++; // The 4th tile forms a second pair with the 3rd
                hasQuad = true;
            }
        }
        
        // For a 13 tile hand:
        let shanten = 6 - pairCount;
        if (numTilesInHand === 14) { // If 14 tiles, we need to discard one.
            // If we have 7 pairs (pairCount == 7), then shanten is -1 (tenpai).
            // Actually, if pairCount is 7 from 14 tiles, it means we have 7 distinct pairs. Shanten = -1 (win).
            // If pairCount is 6 from 14 tiles, it means 6 pairs and 2 singles. Discarding one single -> 6 pairs, 1 single. Shanten = 0.
            // This needs to be shanten for a 13 tile hand usually.
            // For a 14 tile hand, one tile is extra.
            // If after removing the "best" discard, the remaining 13 tiles have shanten X, then the 14 tile hand is X shanten.
            // For now, let's calculate for the *current hand size*.
            // A 14-tile hand with 7 pairs is a win (shanten -1).
            // A 14-tile hand with 6 pairs and 2 singles is 0-shanten (discard a single to make 6 pairs + 1 single waiting for 7th pair).
            shanten = 7 - pairCount -1; // 7 target pairs, -1 because we have an extra tile
            // If pairCount is 7 -> shanten = 7-7-1 = -1 (win)
            // If pairCount is 6 -> shanten = 7-6-1 = 0 (tenpai)
            // If pairCount is 5 -> shanten = 7-5-1 = 1 
        } else { // 13 tiles
            shanten = 6 - pairCount;
        }


        // If hasQuad is true, this isn't a valid chiitoi win, but shanten can still be calculated this way.
        // We might want to return Infinity if hasQuad for a "true" chiitoi path.
        // For now, just calculate structural shanten.

        return shanten;
    }


    // Shanten for Thirteen Orphans (Kokushi Musou)
    function calculateShanten_Kokushi(handMap, numTilesInHand) {
        if (numTilesInHand !== 13 && numTilesInHand !== 14) return Infinity;

        const kokushiTiles = ['1m', '9m', '1p', '9p', '1s', '9s', 'ew', 'sw', 'ww', 'nw', 'wd', 'gd', 'rd'];
        let uniqueKokushiTypesPresent = 0;
        let hasPairOfKokushiTile = false;

        kokushiTiles.forEach(ktId => {
            if (handMap[ktId] > 0) {
                uniqueKokushiTypesPresent++;
                if (handMap[ktId] >= 2) {
                    hasPairOfKokushiTile = true;
                }
            }
        });

        // For a 13-tile hand:
        // Shanten = 13 - uniqueKokushiTypesPresent - (hasPairOfKokushiTile ? 1 : 0)
        // This means if we have all 13 unique types, shanten = 13 - 13 - 0 = 0 (13-way wait)
        // If we have 12 unique types + a pair of one of them, shanten = 13 - 12 - 1 = 0 (single wait)

        let shanten;
        if (numTilesInHand === 14) {
            // With 14 tiles, one is extra.
            // If we have all 13 unique types + one of them is paired -> shanten = -1 (win)
            // If we have all 13 unique types + one extra unique (impossible) OR one extra non-kokushi -> shanten = 0 (discard non-kokushi for 13-way wait)
            // If we have 12 unique types + one pair + one extra (either kokushi or not) -> shanten = 0 (discard the extra for single wait)
            
            // A simpler view for 14 tiles:
            // Target is 13 unique + 1 pair (effectively 14 tiles for the pattern completion).
            // Shanten = (13 - uniqueKokushiTypesPresent) + (hasPairOfKokushiTile ? 0 : 1) -1 (for the extra tile)
            // If all 13 unique, no pair: (13-13) + 1 - 1 = 0 (13-way wait if we discard the 14th non-kokushi tile, or a kokushi tile if it's a 14th distinct one)
            // If all 13 unique, one pair: (13-13) + 0 - 1 = -1 (tsumo)
            // If 12 unique, one pair: (13-12) + 0 - 1 = 0 (single wait)
            // If 12 unique, no pair: (13-12) + 1 - 1 = 1 (two-way wait for type or pair)

            shanten = (13 - uniqueKokushiTypesPresent) + (hasPairOfKokushiTile ? 0 : 1);
            // This is shanten for completing the 13-tile pattern. If we have 14, one is "discardable"
            // So, if this value is X, the 14-tile hand is X-shanten.
            // But this needs to consider the 14th tile itself.
            // Let's use a common formulation:
            // Standard 13-tile Kokushi: 13 types (shanten 0), or 12 types + 1 pair (shanten 0)
            // If 14 tiles:
            //  - If all 13 types present, and one is paired: win (-1 shanten)
            //  - If all 13 types present, and the 14th is one of these 13 (forming a pair): win (-1 shanten)
            //  - If all 13 types present, and 14th is different (non-kokushi): 0 shanten (discard non-kokushi)
            //  - If 12 types present, one is paired, 14th is non-kokushi: 0 shanten (discard non-kokushi)
            //  - If 12 types present, one is paired, 14th is the missing kokushi type: 0 shanten (discard one from pair)
            
            // Let's count how many of the 13 types we need, and if we need a pair.
            let typesNeeded = 13 - uniqueKokushiTypesPresent;
            let pairNeeded = hasPairOfKokushiTile ? 0 : 1;
            shanten = typesNeeded + pairNeeded;
            // This is for a 13 tile hand. If we have 14, it means we are 1 tile closer.
            shanten = shanten -1;


        } else { // 13 tiles
            shanten = (13 - uniqueKokushiTypesPresent) + (hasPairOfKokushiTile ? 0 : 1);
        }
        return Math.max(-1, shanten); // Shanten can't be less than -1 (win)
    }


    // Placeholder for standard hand shanten
    // --- Helper: Convert handMap to sorted array for sequence checking ---
function handMapToSortedArray(handMap) {
    let arr = [];
    // Ensure consistent order for TILE_TYPES iteration for deterministic sorting baseline
    TILE_TYPES.forEach(tileType => {
        const tileId = tileType.id;
        if (handMap[tileId]) {
            for (let i = 0; i < handMap[tileId]; i++) {
                arr.push(tileId);
            }
        }
    });
    // sortMahjongHand(arr); // Already sorted by TILE_TYPES order if populated like this
    return arr;
}


    function calculateShanten_Standard(handMap13Tiles, numTilesInHand) {
        // This function expects a 13-tile hand represented by handMap13Tiles.
        // For getDiscardRecommendation, it will always be called with a 13-tile handMap.
        if (numTilesInHand !== 13) {
            // Fallback for non-13 tile hands (e.g. if called directly for ukeire on smaller parts)
            if (numTilesInHand === 0) return 8; // Max shanten for 0 tiles from 4m1p
            if (numTilesInHand < 0) return Infinity;
            // For hands < 13, shanten is generally higher.
            // A simple approximation: each missing tile from 13 adds roughly 1 to shanten.
            // However, a dedicated shanten for incomplete hands is more complex.
            // For now, let's assume this function is primarily for 13-tile evaluation.
            // If called with, say, 11 tiles, it means we're 2 tiles short of 13,
            // which is already 2 shanten points worse than a 13 tile hand.
            // The standard 8-2M-T-P formula is based on 13 tiles.
            // Let's return a high value if not 13, to indicate it's not the primary use case.
            console.warn(`calculateShanten_Standard was called with ${numTilesInHand} tiles. Designed for 13. Returning estimated high shanten.`);
            return 8; // Or perhaps 8 - (numTilesInHand / 2.5) if you want some scaling.
                    // Sticking to 8 if not 13 simplifies for now.
        }

        let minShantenOverall = 8; // Max possible shanten for a 13-tile hand

        // === Case 1: Atama Nashi (No fixed pair yet / Consider hand as 5 blocks needed) ===
        // Try to form up to 5 blocks (4 melds + 1 pair candidate from taatsu/isolated)
        let noPairHandMap = cloneHandMap(handMap13Tiles);
        let { meldCount: meldsNoPair, remainingHandMap: remNoPairAfterMelds } = extractMaxMelds(noPairHandMap);
        let { taatsuCount: taatsusNoPairOriginal } = extractMaxTaatsus(remNoPairAfterMelds);

        // How many blocks do we have? meldsNoPair + taatsusNoPairOriginal
        // We need 5 blocks. One of the taatsus (if any) will act as the pair.
        // If no taatsus, we need to form a pair from scratch (costs more shanten).
        let shantenNoPair;
        // Max 5 blocks (M + T) are useful.
        let effectiveTaatsuBlocksNoPair = Math.min(taatsusNoPairOriginal, 5 - meldsNoPair);
        if (5 - meldsNoPair < 0) effectiveTaatsuBlocksNoPair = 0; // e.g. 5+ melds (kans involved)

        shantenNoPair = 8 - (2 * meldsNoPair) - effectiveTaatsuBlocksNoPair;
        // If no taatsu could become a pair (e.g., effectiveTaatsuBlocksNoPair was 0 and we needed a pair block,
        // or all taatsu were non-pair types and we needed a pair), add 1.
        // This needs careful checking if `extractMaxTaatsus` distinguishes pair-taatsu.
        // Our `extractMaxTaatsus` prioritizes pairs. So if taatsusNoPairOriginal > 0, a pair candidate exists.
        if (taatsusNoPairOriginal === 0 && meldsNoPair < 5) { // No taatsu to form a pair from, and not enough melds
            shantenNoPair++; // Penalty because we need to form a pair from isolated tiles.
        }
        minShantenOverall = Math.min(minShantenOverall, shantenNoPair);


        // === Case 2: Atama Ari (Iterate through all possible pairs) ===
        // Get unique tile IDs that can form a pair
        const uniqueTileIdsForPairCandidates = Object.keys(handMap13Tiles).filter(id => handMap13Tiles[id] >= 2);

        for (const pairTileId of uniqueTileIdsForPairCandidates) {
            let withPairHandMap = cloneHandMap(handMap13Tiles);
            withPairHandMap[pairTileId] -= 2; // Remove the chosen pair (now 11 tiles left)

            let { meldCount: meldsWithPair, remainingHandMap: remWithPairAfterMelds } = extractMaxMelds(withPairHandMap);
            let { taatsuCount: taatsusWithPair } = extractMaxTaatsus(remWithPairAfterMelds);

            // We have 1 pair fixed. We need 4 more blocks (melds or taatsu) from the remaining 11 tiles.
            // Max 4 blocks from (meldsWithPair + taatsusWithPair) are useful.
            let effectiveTaatsuBlocksWithPair = Math.min(taatsusWithPair, 4 - meldsWithPair);
            if (4 - meldsWithPair < 0) effectiveTaatsuBlocksWithPair = 0; // e.g. already have 4+ melds from 11 tiles (kans)

            let shantenWithThisPair = 8 - (2 * meldsWithPair) - effectiveTaatsuBlocksWithPair - 1; // -1 for the chosen pair
            minShantenOverall = Math.min(minShantenOverall, shantenWithThisPair);
        }
        
        return Math.max(-1, minShantenOverall); // Shanten cannot be less than -1 (win)
    }

    // Helper function to get current "in game" counts for all tiles
function getInGameTileCounts() {
    const counts = {};
    TILE_TYPES.forEach(tile => {
        const tileId = tile.id;
        const countInMyHand = myCurrentHand.filter(t => t === tileId).length;
        const countInMyDiscards = myOwnDiscards[tileId] || 0;
        const countInOthersDiscards = discardedTileCounts[tileId] || 0;
        // TODO: Eventually consider visible melds from all players

        const totalKnown = countInMyHand + countInMyDiscards + countInOthersDiscards;
        counts[tileId] = Math.max(0, 4 - totalKnown);
    });
    return counts;
}


    function calculateUkeire(thirteenTileHandArray) {
        const currentShanten = calculateOverallShanten(thirteenTileHandArray);
        if (currentShanten < 0) return { count: 0, tiles: {} }; // Already a winning hand, no ukeire needed

        const inGameCounts = getInGameTileCounts(); // Get fresh counts
        let totalUkeireCount = 0;
        const usefulTilesDetail = {}; // { 'tileId': countInGame, ... }

        TILE_TYPES.forEach(tileType => {
            const potentialDrawTileId = tileType.id;

            if (inGameCounts[potentialDrawTileId] === 0) {
                return; // No such tiles left in game to draw
            }

            // Check if we already have 4 of this tile in the 13-tile hand (cannot draw a 5th)
            const countIn13TileHand = thirteenTileHandArray.filter(t => t === potentialDrawTileId).length;
            if (countIn13TileHand >= 4) {
                return; // Cannot draw a 5th identical tile to improve standard/chiitoi/kokushi
            }

            // Create a hypothetical 14-tile hand by adding the potential draw
            const fourteenTileHypotheticalHand = [...thirteenTileHandArray, potentialDrawTileId];
            // sortMahjongHand(fourteenTileHypotheticalHand); // Sorting helps if shanten calc relies on it

            // Calculate the shanten of this 14-tile hand.
            // Our getDiscardRecommendation logic already does this: it finds the best discard from 14
            // and the shanten of the resulting 13 tiles IS the shanten of the 14-tile hand.
            let shantenOf14TileHand = Infinity;
            const uniqueTilesIn14 = [...new Set(fourteenTileHypotheticalHand)];

            for (const tileToDiscardFrom14 of uniqueTilesIn14) {
                const temp13Hand = [...fourteenTileHypotheticalHand];
                const indexToRemove = temp13Hand.indexOf(tileToDiscardFrom14);
                if (indexToRemove > -1) {
                    temp13Hand.splice(indexToRemove, 1);
                    shantenOf14TileHand = Math.min(shantenOf14TileHand, calculateOverallShanten(temp13Hand));
                }
            }
            // Now, shantenOf14TileHand is the shanten of the 14-tile hand (i.e., after its optimal discard)

            if (shantenOf14TileHand < currentShanten) {
                // This potentialDrawTileId is useful!
                totalUkeireCount += inGameCounts[potentialDrawTileId];
                usefulTilesDetail[potentialDrawTileId] = (usefulTilesDetail[potentialDrawTileId] || 0) + inGameCounts[potentialDrawTileId];
            }
        });

        return { count: totalUkeireCount, tiles: usefulTilesDetail };
    }


    function calculateOverallShanten(handArray) {
        if (!handArray || handArray.length === 0) return Infinity;
        const numTilesInHand = handArray.length;
        const handMap = getHandFrequencyMap(handArray);

        let minShanten = Infinity;

        // Calculate shanten for different hand types
        minShanten = Math.min(minShanten, calculateShanten_Standard(handMap, numTilesInHand));
        minShanten = Math.min(minShanten, calculateShanten_Chiitoitsu(handMap, numTilesInHand));
        minShanten = Math.min(minShanten, calculateShanten_Kokushi(handMap, numTilesInHand));
        
        return minShanten;
    }

    // --- Update getDiscardRecommendation to use shanten ---
    function getDiscardRecommendation() {
        discardRecommendationEl.textContent = "--"; // Clear previous

        if (myCurrentHand.length !== 14) {
            discardRecommendationEl.textContent = "Hand must have 14 tiles for discard recommendation.";
            return;
        }

        let bestDiscard = null;
        let bestShanten = Infinity;
        let originalShanten = calculateOverallShanten(myCurrentHand); // Shanten of the 14-tile hand

        // Iterate through each tile in hand, try discarding it, and calculate shanten of remaining 13
        for (let i = 0; i < myCurrentHand.length; i++) {
            const tileToDiscard = myCurrentHand[i];
            
            // Avoid trying to discard the same tile value multiple times if hand has duplicates
            if (i > 0 && myCurrentHand[i] === myCurrentHand[i-1]) {
                // If myCurrentHand is sorted, this skips redundant calculations for identical tiles
                // Make sure myCurrentHand is sorted before this loop! (It is by addTileToMyHand)
                continue; 
            }

            const tempHand = [...myCurrentHand];
            tempHand.splice(i, 1); // Create a temporary 13-tile hand

            const currentShanten = calculateOverallShanten(tempHand);

            if (currentShanten < bestShanten) {
                bestShanten = currentShanten;
                bestDiscard = tileToDiscard;
            }
            // TODO: Add ukeire (number of useful tiles) as a tie-breaker if shanten is the same
        }
        
        // The shanten of the 14-tile hand is the shanten of the best 13-tile hand it can form.
        // So, bestShanten IS the shanten of our current 14-tile hand after optimal discard.
        // originalShanten was more of a conceptual placeholder.
        
        let currentOverallShanten = bestShanten; // This is the shanten after the best discard

        if (bestDiscard) {
            const tileObj = TILE_TYPES.find(t => t.id === bestDiscard);
            discardRecommendationEl.textContent = `Shanten: ${currentOverallShanten}. Consider discarding: ${tileObj ? tileObj.name : bestDiscard} (${bestDiscard})`;
        } else if (myCurrentHand.length > 0) {
            // Fallback if somehow no best discard was found (e.g., all discards lead to same shanten)
            // This case should be handled by the loop finding at least one option.
            // Or if the hand is already a win (shanten -1 for the 13-tile hand after discarding the tsumo tile).
            if (currentOverallShanten === -1) { // Means the 13-tile hand is complete
                discardRecommendationEl.textContent = `TSUMO! Shanten: -1. Discard: ${myCurrentHand[myCurrentHand.length-1]} (last drawn as winning tile).`;
                // Actually, if hand is 14 and shanten is -1, it means one tile makes it a win.
                // The 'bestDiscard' logic should find the tile that *isn't* part of the win.
                // Revisit logic for -1 shanten display.
            } else {
                discardRecommendationEl.textContent = `Shanten: ${currentOverallShanten}. No single best discard found by basic logic. (Hand: ${myCurrentHand.join(', ')})`;
            }
        } else {
            discardRecommendationEl.textContent = "Hand empty.";
        }
    }


    // --- Initialize the UI components ---
    initializeDiscardTracker();
    //initializeDrawnTileSelector();
    initializeDrawTileGrid();
    updateAllInGameCounts(); // ** NEW: Initialize all "in game" counts considering empty hand at start **
    updateMyHandDisplay(); // ** NEW: Initialize hand display (will be empty) **
    getDiscardRecommendation(); // ** NEW: Initial call (will show no recommendation) **

    console.log("Mahjong Helper Initialized with My Turn functionalities.");
});