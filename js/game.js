var message = "";
var deviceReadyCalled = false;

CLICK_FEEDBACK_MS = 300;
PING_RATE_MS = 500;

/* Constants */
RED_INDEX = 0;
BLUE_INDEX = 1;
PLAYER_COLOR_INDEX = [RED_INDEX, BLUE_INDEX];

PLAYER_COLORS = [0xee0000, 0x0000ff];
PLAYER_COLORS2 = [0xff9999, 0x9999ff];
PLAYER_COLOR_FLOW = [0xff6666, 0x6666ff];
PLAYER_COLOR_FLOW_ACTIVE = [0xffaaaa, 0xaaaaff];

InputModes = Object.freeze({
    IDLE: 0,
    WAITING_FOR_DEST: 1,
    DEST_CLICK_FEEDBACK_DELAY: 2
});

var animFrameId;

gameState = {
    JOINING: 0,
    WAITING_FOR_PLAYERS: 1,
    PLAYING: 2,
    ENDING: 3,
    ENDED: 4
};

gameData = (function() {
    var self = {
        state: gameState.JOINING,

        lastPing: null,

        cells: null,
        cellsDirty: false
    };

    return self;
})();

game = (function(width, height) {
    var assetsToLoad = [
        "asset/tileable_grass_00.png",
        "asset/tileable_grass_01.png",
        "asset/moon.jpg"
    ];

    var initialised = false;
    var tweening = 0;

    var lastTime = 0;
    var nextTextUpdate = 2000; // 10 seconds
    var frameCount = 0;
    var frameStart = 0;
    
    var nextTick = 0;
    var nextSync = 0;
    var nextPing = 0;
    var tick = 0;

    var stage;
    var renderer;
    var mainContainer; // everything but the winning text etc

    var backgroundContainer;
    var cellContainer;
    var baseContainer;
    var armyContainer;
    var flowContainer;
    
    var topContainer;

    var textContainer;

    var text;
    var textDirty = false;

    var flowsDirty = false;
    
    var generators = [];
    var generatorsDirty = true;
    
    var mapData;
    
    var inputMode = InputModes.IDLE;

    var firstCell, secondCell;
    var destClickFeedbackOff;

    var ENEMY_INDEX;
    var ENEMY_UUID;
    var PLAYER_INDEX;

    var cells = gameData.cells;

    var enemyHasArrived;
    var lastAnnounce = 0;
    var pingSentAt = 0;

    var self = {

        init: function () {
            var interactive = true;
            stage = new PIXI.Stage(0xFFFFFF, interactive);

            renderer = new PIXI.autoDetectRenderer(width, height, RENDER_OPTIONS);
            renderer.view.id = "gamecanvas";
            renderer.view.style.display = "block";

            backgroundContainer = new PIXI.DisplayObjectContainer();
            cellContainer = new PIXI.DisplayObjectContainer();
            baseContainer = new PIXI.DisplayObjectContainer();
            armyContainer = new PIXI.DisplayObjectContainer();
            flowContainer = new PIXI.DisplayObjectContainer();
            textContainer = new PIXI.DisplayObjectContainer();
            
            topContainer = new PIXI.DisplayObjectContainer();

            mainContainer = new PIXI.DisplayObjectContainer();
            mainContainer.addChild(backgroundContainer);
            mainContainer.addChild(cellContainer);
            mainContainer.addChild(baseContainer);
            mainContainer.addChild(armyContainer);
            mainContainer.addChild(flowContainer);

            stage.addChild(mainContainer);
            //stage.addChild(backgroundContainer);
            //stage.addChild(cellContainer);
            //stage.addChild(baseContainer);
            //stage.addChild(armyContainer);
            //stage.addChild(flowContainer);
            stage.addChild(textContainer);
            stage.addChild(topContainer);

            stage.mousedown = stage.touchstart = onCellClick;

            initialised = true;
            return self;
        },

        run: function () {
            if (!initialised) {
                self.init();
            }
            $("#connecting").show();

            if (CONFIG.debug) {
                $("#debugButtons").show();
            } else {
                $("#debugButtons").hide();
            }

            textContainer.removeChildren();
            text = new PIXI.Text("", {font: "20px Roboto,Arial", fill: 'white'});
            text.position.x = 10;
            text.position.y = 10;
            textContainer.addChild(text);


            enemyHasArrived = false;
            PLAYER_INDEX = CONFIG.PLAYER_TEAM;
            ENEMY_INDEX = PLAYER_INDEX === 0 ? 1 : 0;

            net.messageHandler = self.handleMessage;

            var assetsLoaded = false,
                mapLoaded = false,
                socketConnected = net.socket;

            var checkComplete = function() {
                if (assetsLoaded && mapLoaded && socketConnected) {
                    $(".page").hide();
                    document.getElementById("gamearea").appendChild(renderer.view);
                    setupGameState();
                    nextTick = CONFIG.GAME_TICK_MS;
                    nextSync = CONFIG.SYNC_MS;
                    nextPing = PING_RATE_MS;
                    gameData.state = gameState.WAITING_FOR_PLAYERS;
                    net.sendEvent(netevents.announceReady());
                    $("#gamearea").show();
                    self.update(0);
                }
            };

            net.connect(CONFIG.SERVER_ADDRESS, CONFIG.SERVER_PORT, function () {
                console.log("socket connected");
                console.log(net.socket);
                socketConnected = true;
                checkComplete();
            });

            loadAssets(function () {
                assetsLoaded = true;

                loadJSON("maps/map1.json",
                    function (data) {
                        mapData = data;
                        mapLoaded = true;
                        checkComplete();
                    },
                    function (xhr) {
                        console.error(xhr);
                        alert(xhr);
                    }
                );
            });

            window.addEventListener("resize", doResize);
            doResize();
        },

        resetGame: function() {
            net.disconnect();
            gameData.state = gameState.JOINING;
            foreachCell(function(cell) {
               cell.reset();
            });
            mainContainer.filters = null;
            //cellContainer.filters = null;
            //armyContainer.filters = null;
            //backgroundContainer.filters = null;
            //baseContainer.filters = null;
            //flowContainer.filters = null;
        },

        update: function (now) {
            var delta = now - lastTime;
            gameLoop(delta, now);
            lastTime = now;
        },

        getSyncData: function() {
            return {
                cells: cells
            }
        },

        pushSync: function() {
            var e = netevents.pushsync(self);
            net.sendEvent(e);
        },

        pushUpdateSync: function() {
            var changes = [];
            foreachCell(function (cell) {
                if (cell.lastChange !== 0) {
                    changes.push(cell);
                }
            });
            if (changes.length > 0) {
                var e = netevents.sync(changes);
                net.sendEvent(e);
            }
            [].forEach.call(changes, function(cell) {
                cell.lastChange = 0;
            });
        },

        handleMessage: function(e) {
            console.log(e.action);
            switch(e.action) {
                case "pingpeer":
                    var ev = netevents.pingresponse(e.timestamp, e.playeruuid);
                    net.sendEvent(ev);
                    break;

                case "pingresponse":
                    if (e.respondTo === CONFIG.PLAYER_UUID) {
                        if (e.pingStart === pingSentAt) {
                            gameData.lastPing = Date.now() - pingSentAt;
                        } else {
                            console.log("dropped ping", pingSentAt)
                        }
                    }
                    break;

                case "pushsync":
                    cells = e.syncData.cells;
                    [].forEach.call(cells, function(a) {
                        [].forEach.call(a, function(cell) {
                            cell.__proto__ = Cell.prototype;
                        });
                    });
                    gameData.cellsDirty = true;
                    flowsDirty = true;
                    generatorsDirty = true;
                    textDirty = true;
                    break;

                case "sync":
                    [].forEach.call(e.cells, function(cell) {
                        cells[cell.xi][cell.yi].sync(cell);
                    });
                    gameData.cellsDirty = true;
                    flowsDirty = true;
                    textDirty = true;
                    break;

                case "flowconnect":
                    self.flowConnect(e.team, e.start.x, e.start.y, e.end.x, e.end.y);
                    break;

                case "flowclear":
                    self.flowClear(e.team, e.cell.x, e.cell.y);
                    break;

                case "ready":
                    console.log("ready: ", e);
                    if (e.team === ENEMY_INDEX) {
                        var oldState = gameData.state;
                        gameData.state = gameState.PLAYING;
                        ENEMY_UUID = e.playeruuid;
                        if (oldState === gameState.WAITING_FOR_PLAYERS) {
                            net.sendEvent(netevents.announceReady());
                        }
                    }
                    break;

            }
        },

        flowConnect: function(team, x1,y1, x2,y2) {
            var firstCell = cells[x1][y1];
            var secondCell = cells[x2][y2];

            var direction;
            if (secondCell.xi > firstCell.xi) {
                direction = Cell.RIGHT;
            } else if (secondCell.xi < firstCell.xi) {
                direction = Cell.LEFT;
            } else if (secondCell.yi < firstCell.yi) {
                direction = Cell.UP;
            } else if (secondCell.yi > firstCell.yi) {
                direction = Cell.DOWN;
            } else {
                self.flowClear(team, firstCell.xi, firstCell.yi);
                return;
            }
            firstCell.flows[team][direction] = !firstCell.flows[team][direction];

            // If the destination cell already has a flow back to the origin cell, remove that flow.
            direction = (direction + 2) % 4; // reverse direction
            secondCell.flows[team][direction] = false;

            flowsDirty = true;
        },

        flowClear: function(team, x,y) {
            var cell = cells[x][y];
            for (var i = 0; i < 4; i++) {
                cell.flows[team][i] = false;
                var adjacent = getOffsetCell(cell, i);
                if (adjacent) {
                    adjacent.flows[team][(i+2)%4] = false;
                }
            }
            flowsDirty = true;
        },

        pingpeer: function() {
            var ev = netevents.pingpeer();
            pingSentAt = ev.timestamp;
            net.sendEvent(ev);
        }
    };

    function setInputMode(newMode) {
        if (inputMode !== newMode) {
            inputMode = newMode;
            textDirty = true;
        }
    }

    function onCellClick(ev) {
        if (gameData.state !== gameState.PLAYING) {
            return;
        }

        var p = Cell.fromCss(ev.global.x, ev.global.y);
        switch(inputMode) {
            case InputModes.IDLE:
                firstCell = cells[p.x][p.y];
                var g = new PIXI.Graphics();
                g.lineStyle(0);
                g.beginFill(0xffffff, 0.8);
                g.drawShape(Cell.toCssBoundsRect(p.x, p.y));
                
                g.beginFill(0xffffff, 0.4);
                if (p.x > 0) {
                    g.drawShape(Cell.toCssBoundsRect(p.x-1, p.y));
                }
                if (p.x < cells.length) {
                    g.drawShape(Cell.toCssBoundsRect(p.x+1, p.y));
                }
                if (p.y > 0) {
                    g.drawShape(Cell.toCssBoundsRect(p.x, p.y-1));
                }
                if (p.y < cells[0].length) {
                    g.drawShape(Cell.toCssBoundsRect(p.x, p.y+1));
                }
                topContainer.addChild(g);
                
                setInputMode(InputModes.WAITING_FOR_DEST);
                break;

            case InputModes.WAITING_FOR_DEST:
                var valid = (
                    (p.x === firstCell.xi && p.y === firstCell.yi) ||
                    (p.x === firstCell.xi-1 && p.y === firstCell.yi) ||
                    (p.x === firstCell.xi && p.y === firstCell.yi-1) ||
                    (p.x === firstCell.xi+1 && p.y === firstCell.yi) ||
                    (p.x === firstCell.xi && p.y === firstCell.yi+1)
                );
                if (valid) {
                    secondCell = cells[p.x][p.y];
                    destClickFeedbackOff = lastTime + CLICK_FEEDBACK_MS;
                    var g = new PIXI.Graphics();
                    g.lineStyle(0);
                    g.beginFill(0xffffff, 0.8);
                    g.drawShape(Cell.toCssBoundsRect(p.x, p.y));
                    topContainer.addChild(g);
                    setInputMode(InputModes.DEST_CLICK_FEEDBACK_DELAY);
                    handleClickComplete(firstCell, secondCell);
                } else {
                    topContainer.removeChildren();
                    setInputMode(InputModes.IDLE);
                }
                break;

            case InputModes.DEST_CLICK_FEEDBACK_DELAY:
                // Drop all events while we're waiting
                break;

            default:
                setInputMode(InputModes.IDLE);
        }
    }
    
    function getArmyAtCell(x,y) {
        var army;
        foreachArmy(function(a){
            if (firstCell.xi === a.x && firstCell.yi === a.y) {
                army = a;
                return false;
            }
        });
        return army;
    }
    
    function getOffsetCell(cell, direction, count) {
        count = count || 1;
        var newx, newy;
        switch (direction) {
            case Cell.UP:
                newx = cell.xi;
                newy = cell.yi - count;
                break;
            
            case Cell.RIGHT:
                newx = cell.xi + count;
                newy = cell.yi;
                break;
                
            case Cell.DOWN:
                newx = cell.xi;
                newy = cell.yi + count;
                break;
                
            case Cell.LEFT:
                newx = cell.xi - count;
                newy = cell.yi;            
                break;
        }
        
        if (newx < 0 || newx >= cells.length || newy < 0 || newy >= cells[0].length) {
            return null;
        } else {
            return cells[newx][newy];
        }
    }

    function handleClickComplete(firstCell, secondCell) {
        net.sendEvent(netevents.flowconnect(firstCell.xi, firstCell.yi, secondCell.xi, secondCell.yi));
        self.flowConnect(PLAYER_INDEX, firstCell.xi, firstCell.yi, secondCell.xi, secondCell.yi);
    }

    function doFPS(timeDelta, timeStamp) {
        if (CONFIG.debug) {
            if (timeStamp > nextTextUpdate || textDirty) {
                nextTextUpdate = timeStamp + 1000;
                text.setText(
                    mapData.title + " - "
                    + (frameCount / ((timeStamp - frameStart) / 1000.0)).toFixed(0) + " fps"
                    + ((message != "") ? (" - " + message) : "")
                        //+ " - im: " + inputMode
                    + " - plyr: " + PLAYER_INDEX
                    + " - tk: " + tick
                        //+ " - pr: " + window.devicePixelRatio
                        //+ " (" + window.innerWidth + "," + window.innerHeight + ")"
                    + ((typeof GooglePlayGamesPlugin !== 'undefined') ? "\nGooglePlayGamesPlugin exists" : "")
                        //+ (deviceReadyCalled ? "" : "\ndeviceready not called")
                    + "\nsocket: " + (net.socket ? net.socket.readyState : "none")
                    + " - state: " + gameData.state + " - sent: " + net.messagesSent + "/" + (net.bytesSent / 1024).toFixed(0) + "kb"
                    + " - received: " + net.messagesReceived + "/" + (net.bytesReceived / 1024).toFixed(0) + "kb"
                    + "\nping: " + gameData.lastPing + " ms"
                );
                frameCount = 0;
                frameStart = timeStamp;
                textDirty = false;
            } else {
                frameCount++;
            }
        }
    }
    
    function flowCellPlayer(player, cell, lagFactor) {
        // Step 1: Determine how many flows leave the cell
        // Step 2: Split CONFIG.FLOW_RATE evenly
        // Step 2a: If a dest cell is a flow rate limiter or accelerator, apply that to the relevant flow.
        
        var flowcount = 0.0;
        for (var direction = 0; direction < 4; direction++) {
            if (cell.flows[player][direction]) {
                var dest = getOffsetCell(cell, direction);
                if (dest.armyStrength < 1.0  &&  (dest.armyOwner === player || dest.armyOwner < 0)) {
                    flowcount = flowcount + 1.0;
                    cell.flowed[player][direction] = Date.now();
                }
            }
        }

        var totalFlowOut = 0.0;
        var flowPer =  Math.min(CONFIG.FLOW_RATE * lagFactor, cell.armyStrength) / flowcount;
        
        for (var direction = 0; direction < 4; direction++) {
            if (cell.armyOwner === player  &&  cell.flows[player][direction]) {
                var dest = getOffsetCell(cell, direction);
                if (dest.armyStrength >= 1.0) {
                    // destination full
                    cell.flowed[player][direction] = false;
                } else if (dest.armyOwner !== -1 && dest.armyOwner !== player) {
                    // can't flow into enemy cell
                } else {
                    if (dest.armyOwner < 0) {
                        dest.armyOwner = player;

                        // break enemy flows
                        var enemy = (player === 0 ? 1 : 0);
                        for (var f = 0; f < 4; f++) {
                            dest.flows[enemy][f] = false;
                        }
                        // TODO: ALSO BREAK ENEMY FLOWS INTO THIS CELL
                    }
                    
                    var flowedAmount = flowPer;
                    if (flowedAmount > (1.0 - dest.armyStrength)) {
                        flowedAmount = (1.0 - dest.armyStrength);
                    }
                    dest.armyStrength += flowedAmount;
                    if (dest.armyOwner === PLAYER_INDEX) {
                        dest.lastChange = Date.now();
                    }
                    totalFlowOut += flowedAmount;
                }
            }
        }
        if (totalFlowOut > 0.0) {
            cell.armyStrength -= totalFlowOut;
            if (cell.armyOwner === PLAYER_INDEX) {
                cell.lastChange = Date.now();
            }
        }
    }

    function flowCell(cell, lagFactor) {
        flowCellPlayer(0, cell, lagFactor);
        flowCellPlayer(1, cell, lagFactor);
    }

    function stepCombat(cell, lagFactor) {
        // Check if any flows in
        // If flows in, total up army strength in (attackers)
        // Apply to army strength in cell (defender)
        
        var attackingCells = [];
        
        // Find all attacking cells
        for(var d = 0; d < 4; d++) {
            var adjacent = getOffsetCell(cell, d);
            if (adjacent  &&  adjacent.armyOwner !== cell.armyOwner  &&  adjacent.armyStrength > 0  && adjacent.anyFlows()) {
                var opposite_d = (d + 2) % 4;                
                if (adjacent.flows[adjacent.armyOwner][opposite_d]) {
                    adjacent.flowed[adjacent.armyOwner][opposite_d] = Date.now();
                    attackingCells.push(adjacent);
                }
            }
        }
        
        if (attackingCells.length > 0) {
            var totalAttack = 0.0;
            for (var i = 0; i < attackingCells.length; i++) {
                totalAttack += attackingCells[i].armyStrength;
            }
            
            // Larger army reduces its own casualties, but doesn't increase enemy casualties
            var defenderCasualties = ((totalAttack * CONFIG.CASUALTY_FACTOR) * Math.min((totalAttack / cell.armyStrength)*0.50, 1)) * lagFactor;
            var attackerCasualties = ((cell.armyStrength * CONFIG.CASUALTY_FACTOR) * Math.min((cell.armyStrength / totalAttack)*0.50, 1)) * lagFactor;
            
            cell.armyStrength -= defenderCasualties;
            if (cell.armyOwner === PLAYER_INDEX) {
                cell.lastChange = Date.now();
            }
            if (cell.armyStrength < 0.0) {
                cell.armyStrength = 0.0;
                if (cell.armyOwner >= 0) {
                    for (d = 0; d < 4; d++) {
                        cell.flows[cell.armyOwner][d] = false;
                        cell.flowed[cell.armyOwner][d] = 0;
                    }
                }
                cell.armyOwner = attackingCells[0].armyOwner;
                if (cell.armyOwner === PLAYER_INDEX) {
                    cell.lastChange = Date.now();
                }
                if (cell.generatorSpeed > 0.0) {
                    generatorsDirty = true;
                }
            }
            
            var a = attackerCasualties / attackingCells.length;
            for (var i = 0; i < attackingCells.length; i++) {
                if (attackingCells[i].armyOwner === PLAYER_INDEX) {
                    attackingCells[i].lastChange = Date.now();
                }
                attackingCells[i].armyStrength -= a;
                if (attackingCells[i].armyStrength <= 0.0) {
                    attackingCells[i].armyStrength = 0.0;
                    attackingCells[i].armyOwner = -1;
                }
            }
        }
    }

    function stepGameState(timeDelta, timeStamp) {
        if (inputMode === InputModes.DEST_CLICK_FEEDBACK_DELAY  &&  timeStamp >= destClickFeedbackOff) {
            topContainer.removeChildren();
            setInputMode(InputModes.IDLE);
        }
        
        if (timeStamp >= nextTick) {
            var thisTickMS = timeStamp - nextTick + CONFIG.GAME_TICK_MS;  // actual time for this tick. for lag adjustment etc.
            nextTick = timeStamp + CONFIG.GAME_TICK_MS;
            var lagFactor = thisTickMS / CONFIG.GAME_TICK_MS;
            tick++;
                    
            foreachCell(function(cell) {
                if (cell.generatorSpeed > 0  &&  cell.armyStrength < 1.0) {
                    cell.armyStrength = Math.min(cell.armyStrength + cell.generatorSpeed, 1.0);
                    if (cell.armyOwner === PLAYER_INDEX) {
                        cell.lastChange = Date.now();
                    }
                }
                
                if (cell.armyStrength > 0  &&  cell.armyOwner >= 0  && cell.anyFlows()) {
                    flowCell(cell, lagFactor);
                } else {
                    for (var d = 0; d < 4; d++) {
                        cell.flowed[0][d] = false;
                        cell.flowed[1][d] = false;
                    }
                }
                return true;
            });
            
            // fight
            foreachCell(function(cell) {
                stepCombat(cell, lagFactor);
            });
            gameData.cellsDirty = true;
        }

        if (timeStamp >= nextSync) {
            var totalTeamArmies = Array(2);
            totalTeamArmies[0] = 0;
            totalTeamArmies[1] = 0;
            foreachCell(function(cell) {
                if (cell.armyOwner >= 0) {
                    totalTeamArmies[cell.armyOwner] += cell.armyStrength;
                }
            });

            var playerDead = totalTeamArmies[PLAYER_INDEX] < 0.05;
            var enemyDead = totalTeamArmies[ENEMY_INDEX] < 0.05;

            if (playerDead && enemyDead) {
                gameover(0);
            } else if (playerDead) {
                gameover(-1);
            } else if (enemyDead) {
                gameover(+1);
            }

            nextSync = timeStamp + CONFIG.SYNC_MS;
            self.pushUpdateSync();
        }

        if (timeStamp >= nextPing) {
            self.pingpeer();
            nextPing = timeStamp + PING_RATE_MS;
        }
    }

    self.gameover = gameover;

    function gameover(win) {
        gameData.state = gameState.ENDED;
        textContainer.removeChildren();
        var bf = new PIXI.BlurFilter();
        bf.blur = 15;
        mainContainer.filters = [bf];
        //backgroundContainer.filters = [bf];
        //baseContainer.filters = [bf];
        //flowContainer.filters = [bf];
        //cellContainer.filters = [bf];
        //armyContainer.filters = [bf];

        var t;
        if (win < 0) {
            t = "YOU LOSE!";
        } else if (win > 0) {
            t = "YOU WIN!";
        } else {
            t = "DRAW!";
        }

        var text = new PIXI.Text(t, {
            font: "80px Roboto,Arial",
            fill: 'yellow',
            stroke: 'red',
            strokeThickness: 5,
            dropShadow: true,
            dropShadowDistance: 10,
            dropShadowColor: "#333333"
        });
        textContainer.addChild(text);

        var animateId;
        var finalx = ~~((renderer.width - text.width) / 2),
            finaly = ~~((renderer.height - text.height) / 2);

        text.position.x = finalx;
        text.position.y = -text.height;

        var tween = new TWEEN.Tween({ypos: -text.height, ratio: 0})
            .to({ypos: finaly, ratio: 1.0}, 2000)
            .easing(TWEEN.Easing.Bounce.Out)
            .onStart(function () {
                console.log("tween start ", tweening);
            })
            .onStop(function() {
                tweening--;
                console.log("tween end ", tweening);
            })
            .onComplete(function() {
                tweening--;
                console.log("tween end ", tweening);
            })
            .onUpdate(function () {
                text.position.x = ~~(finalx + (text.width * (1-this.ratio)));
                text.position.y = this.ypos;
                text.scale.x = this.ratio;
                text.scale.y = this.ratio;
            })
            .start();
        tweening++;
    }


    function gameLoop(timeDelta, timeStamp) {
        doFPS(timeDelta, timeStamp);

        switch (gameData.state) {
            case gameState.JOINING:
            case gameState.WAITING_FOR_PLAYERS:
                if (gameData.cellsDirty) {
                    drawCells();
                    gameData.cellsDirty = false;
                }

                if (lastAnnounce + 1000 < timeStamp) {
                    lastAnnounce = timeStamp;
                    net.sendEvent(netevents.announceReady());
                }
                break;

            case gameState.PLAYING:
                stepGameState(timeDelta, timeStamp);

                if (gameData.cellsDirty) {
                    drawCells();
                    gameData.cellsDirty = false;
                }

                //if (flowsDirty) {
                drawFlows();
                flowsDirty = false;
                //}

                if (generatorsDirty) {
                    drawGens();
                    generatorsDirty = false;
                }
                break;

            case gameState.ENDING:
            case gameState.ENDED:
                break;

        }

        if (tweening > 0) {
            TWEEN.update(timeStamp);
        }

        renderer.render(stage);

        animFrameId = requestAnimFrame(self.update);
    }

    function foreachCell(fn) {
        for (var x = 0; x < cells.length; x++) {
            for (var y = 0; y < cells[x].length; y++) {
                if (fn(cells[x][y]) === false) {
                    return;
                }
            }
        }
    }
    
    function foreachArmy(fn) {
        for (var i = 0; i < armies.length; i++) {
            if (fn(armies[i]) === false) {
                return;
            }
        }
    }
    
    function foreachBase(fn) {
        for (var i = 0; i < generators.length; i++) {
            if (fn(generators) === false) {
                return;
            }
        }
    }

    function initGens(gens, color) {
        if (mapData.generators === undefined) {
            return;
        }
        for (var i = 0; i < mapData.generators.length; i++) {
            var cell = cells[mapData.generators[i].x][mapData.generators[i].y];
            cell.armyOwner = mapData.generators[i].owner;
            cell.generatorSpeed = mapData.generators[i].speedFactor;
            cell.generatorSpeed = cell.generatorSpeed ? cell.generatorSpeed : CONFIG.GENERATOR_SPEED;
            cell.armyStrength = 0.0;
            gameData.cellsDirty = true;
        }
    }

    function initArmies() {
        if (mapData.armies === undefined) {
            return;
        }
        
        for (var i = 0; i < mapData.armies.length; i++) {
            var cell = cells[mapData.armies[i].x][mapData.armies[i].y];
            cell.armyOwner = mapData.armies[i].owner;
            cell.armyStrength = 1.0;
        }
    }

    function drawCells() {
        armyContainer.removeChildren();
        var garmy = new PIXI.Graphics();
        foreachCell(function(cell) {        
            if (cell.armyOwner >= 0) {
                garmy.lineStyle(1, PLAYER_COLORS2[cell.armyOwner], 1.0);
                garmy.beginFill(PLAYER_COLORS[cell.armyOwner], 1.0);
                garmy.drawShape(getArmyShape(cell.xi, cell.yi, cell.armyStrength));
            }
        });
        armyContainer.addChild(garmy);
    }
    
    function drawFlow_middle(graphic, player, startCell, endCell) {
        var w = 3;//Math.max(CONFIG.CELL_WIDTH / 20, 1);
        graphic.lineStyle(w, PLAYER_COLOR_FLOW[player], 0.8);
        graphic.moveTo(Cell.toCssMidX(startCell.xi), Cell.toCssMidY(startCell.yi));
        graphic.lineTo(Cell.toCssMidX(endCell.xi), Cell.toCssMidY(endCell.yi));
        graphic.beginFill(PLAYER_COLOR_FLOW[player], 0.8);
        graphic.drawCircle(Cell.toCssMidX(endCell.xi), Cell.toCssMidY(endCell.yi), 3);
    }

    function drawFlow(graphic, player, startCell, endCell) {
        var w = 3;
        var offsetw = (CONFIG.CELL_WIDTH / 2) / 2;
        var offseth = (CONFIG.CELL_HEIGHT / 2) / 2;

        var sr = Cell.toCssBoundsRect(startCell.xi, startCell.yi).inflateRect(-offsetw, -offseth);
        var er = Cell.toCssBoundsRect(endCell.xi, endCell.yi).inflateRect(-offsetw, -offseth);


        var bx,by, ex,ey, direction;
        if (endCell.xi > startCell.xi) {        // right flow
            bx = sr.x + sr.width;
            by = sr.y + sr.height/2;
            ex = er.x;
            ey = by;
            direction = Cell.RIGHT;
        } else if (endCell.xi < startCell.xi) { //left flow
            bx = sr.x;
            by = sr.y + sr.height/2;
            ex = er.x + er.width;
            ey = by;
            direction = Cell.LEFT;
        } else if (endCell.yi > startCell.yi) { // down flow
            bx = sr.x + sr.width/2;
            by = sr.y + sr.height;
            ex = bx;
            ey = er.y;
            direction = Cell.DOWN;
        } else {                                // up flow
            bx = sr.x + sr.width/2
            by = sr.y;
            ex = bx;
            ey = er.y + er.height;
            direction = Cell.UP;
        }

        if (startCell.flowed[player][direction]) {
            graphic.lineStyle(w, PLAYER_COLOR_FLOW_ACTIVE[player], 0.7);
            graphic.beginFill(PLAYER_COLOR_FLOW_ACTIVE[player], 0.7);
        } else {
            graphic.lineStyle(w, PLAYER_COLOR_FLOW[player], 0.5);
            graphic.beginFill(PLAYER_COLOR_FLOW[player], 0.5);
        }

        graphic.moveTo(bx,by);
        graphic.lineTo(ex,ey);
        graphic.drawCircle(ex,ey,3);
    }
    
    function drawFlows() {
        flowContainer.removeChildren();
        var g = new PIXI.Graphics;
        foreachCell(function(cell) {
            if (CONFIG.SHOW_ENEMY_FLOWS) {
                for (var i = 0; i < 4; i++) {
                    if (cell.flows[ENEMY_INDEX][i]) {
                        var toCell = getOffsetCell(cell, i);
                        if (toCell) {
                            drawFlow(g, ENEMY_INDEX, cell, toCell);
                        }
                    }
                }
            }

            for (var i = 0; i < 4; i++) {
                if (cell.flows[PLAYER_INDEX][i]) {
                    var toCell = getOffsetCell(cell, i);
                    if (toCell) {
                        drawFlow(g, PLAYER_INDEX, cell, toCell);
                    }
                }
            }
        });
        flowContainer.addChild(g);
    }
    
    function initMap(mapData) {
        // Create the background
        var texture = new PIXI.Texture.fromImage("asset/" + mapData.backgroundImage);
        var tilingSprite = new PIXI.TilingSprite(texture, window.innerWidth, window.innerHeight);
        backgroundContainer.addChild(tilingSprite);
        
        // Create the cells
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(1, mapData.lineColor, 0.15);
        gameData.cells = Array(Cell.XHi);

        for (var x = 0; x < Cell.XHi; x++) {
            gameData.cells[x] = Array(Cell.YHi);
            for (var y = 0; y < Cell.YHi; y++) {
                gameData.cells[x][y] = new Cell(x, y);
                var rgb = Array(3);
                for (var i = 0; i < 3; i++) {
                    rgb[i] = mapData.minColor[i] + (Math.random() * (mapData.maxColor[i] - mapData.minColor[i]));
                }
                if (!mapData.backgroundImage) {
                    graphics.beginFill((~~(rgb[0] << 16)) | (~~(rgb[1] << 8)) | ~~rgb[2], 1.0);
                }
                graphics.drawRect(x * CONFIG.CELL_WIDTH, y * CONFIG.CELL_HEIGHT, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);
            }
        }
        cellContainer.addChild(graphics);

        cells = gameData.cells;

        // Create the bases
        initGens();
        initArmies();

        drawGens();
    }
    
    function getBaseShape(cell) {
        return new PIXI.Circle(
            Cell.toCssMidX(cell.xi),
            Cell.toCssMidY(cell.yi),
            (CONFIG.CELL_WIDTH / 2) -1
        );
    }

    function drawGens() {
        baseContainer.removeChildren();
        var g = new PIXI.Graphics();
        foreachCell(function(cell) {
            if (cell.generatorSpeed && cell.generatorSpeed > 0.0) {
                g.lineStyle(2, PLAYER_COLORS[cell.armyOwner], 1.0);
                g.drawShape(getBaseShape(cell));
            }
        });
        baseContainer.addChild(g);
    }
    
    function getArmyShape(x,y, strength) {
        var INSET = 4;
        var w = (CONFIG.CELL_WIDTH - INSET * 2) * strength,
            h = (CONFIG.CELL_HEIGHT - INSET * 2) * strength;
        var x = Cell.toCssMidX(x) - (w / 2),
            y = Cell.toCssMidY(y) - (h / 2);

        return new PIXI.Rectangle(x, y, w, h);
    }
    

    function loadAssets(callback) {
        if (assetsToLoad.length > 0) {
            var loader = new PIXI.AssetLoader(assetsToLoad);
            loader.onComplete = callback;
            loader.onProgress = function(e) {
                // console.log(e);
            };
            loader.load();
        } else {
            callback();
        }
    }

    function doResize(event) {
        var widthToHeight = width/height;
        var newWidth = window.innerWidth;
        var newHeight = window.innerHeight;

        var newWidthToHeight = newWidth / newHeight;

        if (newWidthToHeight > widthToHeight) { // window width is too wide relative to desired game width
            newWidth = newHeight * widthToHeight;
        } else { // window height is too high relative to desired game height
            newHeight = newWidth / widthToHeight;
        }

        document.getElementById("gamearea").style.cssText +=
            "height: " + newHeight + "px; width: " + newWidth + "px; "
            + "margin-top: " + ((window.innerHeight - newHeight) / 2) + "px; "
            + "margin-left: " + ((window.innerWidth - newWidth) / 2) + "px;";
    }

    function setupGameState() {
        initMap(mapData);
    }

    document.addEventListener("deviceready", function() {
        console.log("deviceready");
        deviceReadyCalled = true;
        if (typeof GooglePlayGamesPlugin !== 'undefined') {
            GooglePlayGamesPlugin.connect();
        }
    }, false);    

    return self;
})(CONFIG.X_RESOLUTION,
   CONFIG.Y_RESOLUTION);
