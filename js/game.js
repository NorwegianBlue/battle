var message = "";

CLICK_FEEDBACK_MS = 300;

/* Constants */
RED_INDEX = 0;
BLUE_INDEX = 1;

ENEMY_INDEX = 0;
PLAYER_INDEX = 1;

PLAYER_COLORS = [0xee0000, 0x0000ff];
PLAYER_COLORS2 = [0xff9999, 0x9999ff];

InputModes = Object.freeze({
    IDLE: 0,
    WAITING_FOR_DEST: 1,
    DEST_CLICK_FEEDBACK_DELAY: 2
});

game = (function(width, height) {
    var assetsToLoad = [];

    var lastTime = 0;
    var nextTextUpdate = 2000; // 10 seconds
    var frameCount = 0;
    var frameStart = 0;
    
    var nextTick = 0;
    var tick = 0;

    var stage;
    var renderer;

    var cellContainer;
    var baseContainer;
    var armyContainer;
    var flowContainer;
    
    var topContainer;

    var textContainer;

    var text;
//    var message;
    var textDirty = false;

    var cells;
    var cellsDirty = false;

    var flowsDirty = false;
    
    var generators = [];
    var generatorsDirty = true;
    
    var mapData;
    
    var inputMode = InputModes.IDLE;

    var firstCell, secondCell;
    var destClickFeedbackOff;

    var self = {

        init: function () {
            var interactive = true;
            stage = new PIXI.Stage(0xFFFFFF, interactive);

            renderer = new PIXI.autoDetectRenderer(width, height, RENDER_OPTIONS);
            renderer.view.id = "gamecanvas";
            renderer.view.style.display = "block";

            cellContainer = new PIXI.DisplayObjectContainer();
            baseContainer = new PIXI.DisplayObjectContainer();
            armyContainer = new PIXI.DisplayObjectContainer();
            flowContainer = new PIXI.DisplayObjectContainer();
            textContainer = new PIXI.DisplayObjectContainer();
            
            topContainer = new PIXI.DisplayObjectContainer();

            window.addEventListener("resize", doResize);
            doResize();

            stage.addChild(cellContainer);
            stage.addChild(baseContainer);
            stage.addChild(flowContainer);
            stage.addChild(armyContainer);
            stage.addChild(textContainer);
            stage.addChild(topContainer);

            /*
            redBase = new PIXI.Graphics();
            redBase.interactive = true;
            redBase.mousedown = redBase.touchstart = function (interactionData) {
                var gd = redBase.graphicsData[0];
                redBase.clear();
                redBase.lineStyle(1, 0xffffff, 0.8);
                redBase.beginFill(0xffffff, 0.8);
                redBase.drawRect(gd.shape.x, gd.shape.y, gd.shape.width, gd.shape.height);
            };
            baseContainer.addChild(redBase);

            blueBase = new PIXI.Graphics();
            baseContainer.addChild(blueBase);
            */

            text = new PIXI.Text("Battle", {font: "20px Roboto,Arial", fill: 'white'});
            text.position.x = 10;
            text.position.y = 10;
            textContainer.addChild(text);
            
            stage.mousedown = stage.touchstart = onCellClick;

            return self;
        },

        run: function () {
            loadAssets(function () {
                document.getElementById("gamearea").appendChild(renderer.view);

                loadJSON("maps/map1.json",
                    function (data) {
                        mapData = data;
                        setupGameState();
                        nextTick = CONFIG.GAME_TICK_MS;
                        self.update(0);
                    },
                    function (xhr) {
                        console.error(xhr);
                    }
                );
            });
        },

        update: function (now) {
            var delta = now - lastTime;
            gameLoop(delta, now);
            lastTime = now;
        }
    };

    function setInputMode(newMode) {
        if (inputMode !== newMode) {
            inputMode = newMode;
            textDirty = true;
        }
    }

    function onCellClick(ev) {
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
            // clicked the same cell twice - erase all flows
            for (var i = 0; i < 4; i++) {
                firstCell.flows[PLAYER_INDEX][i] = false;
                var adjacent = getOffsetCell(firstCell, i);
                if (adjacent) {
                    adjacent.flows[PLAYER_INDEX][(i+2)%4] = false;
                }
            }
            flowsDirty = true;
            return;
        }
        if (firstCell.flows[PLAYER_INDEX][direction]) {
            firstCell.flows[PLAYER_INDEX][direction] = false;
        } else {
            firstCell.flows[PLAYER_INDEX][direction] = true;
        }

        // If the destination cell already has a flow back to the origin cell, remove that flow.
        direction = (direction + 2) % 4; // reverse direction
        
        if (secondCell.flows[PLAYER_INDEX][direction]) {
            secondCell.flows[PLAYER_INDEX][direction] = false;
        }
        
        flowsDirty = true;
    }

    function doFPS(timeDelta, timeStamp) {
        if (timeStamp > nextTextUpdate  ||  textDirty) {
            nextTextUpdate = timeStamp + 1000;
            text.setText(
                mapData.title + " - "
                + (frameCount / ((timeStamp - frameStart) / 1000.0)).toFixed(0) + " fps"
                + ((message != "") ? (" - " + message) : "")
                + " - inputMode: " + inputMode
                + " - tick: " + tick
            );
            frameCount = 0;
            frameStart = timeStamp;
            textDirty = false;
        } else {
            frameCount++;
        }
    }
    
    function flowCell_simple(cell, tickMS) {
        for (var direction = 0; direction < 4; direction++ ) {
          if (cell.flows[PLAYER_INDEX][direction]) {
              var dest = getOffsetCell(cell, direction);
              if (dest.armyStrength >= 1.0) {
                  // can't flow anymore
              } else {
                  if (dest.armyOwner < 0) {
                    dest.armyOwner = PLAYER_INDEX;
                  }
                  
                  var flowedAmount = CONFIG.FLOW_RATE;
                  if (flowedAmount > cell.armyStrength) {
                      flowedAmount = cell.armyStrength;
                  }
                  if (flowedAmount > (1.0 - dest.armyStrength)) {
                      flowedAmount = (1.0 - dest.armyStrength);
                  }
                  dest.armyStrength = dest.armyStrength + flowedAmount;
                  cell.armyStrength = cell.armyStrength - flowedAmount;
              }
          }
        }
    }
    
    function flowCell(cell, tickMS) {
        // Step 1: Determine how many flows leave the cell
        // Step 2: Split CONFIG.FLOW_RATE evenly
        // Step 2a: If a dest cell is a flow rate limiter or accelerator, apply that to the relevant flow.
        
        var flowcount = 0.0;
        for (var direction = 0; direction < 4; direction++) {
            if (cell.flows[PLAYER_INDEX][direction]) {
                var dest = getOffsetCell(cell, direction);
                if (dest.armyStrength < 1.0  &&  dest.armyOwner !== ENEMY_INDEX) {
                    flowcount = flowcount + 1.0;
                }
            }
        }
        
        var totalFlowOut = 0.0;
        var flowPer =  Math.min(CONFIG.FLOW_RATE, cell.armyStrength) / flowcount;
        
        for (var direction = 0; direction < 4; direction++) {
            if (cell.flows[PLAYER_INDEX][direction]) {
                var dest = getOffsetCell(cell, direction);
                if (dest.armyStrength >= 1.0  ||  dest.armyOwner === ENEMY_INDEX) {
                    // can't flow anymore
                } else {
                    if (dest.armyOwner < 0) {
                        dest.armyOwner = PLAYER_INDEX;
                    }
                    
                    var flowedAmount = flowPer;
                    if (flowedAmount > (1.0 - dest.armyStrength)) {
                        flowedAmount = (1.0 - dest.armyStrength);
                    }
                    dest.armyStrength += flowedAmount;                    
                    totalFlowOut += flowedAmount;
                }
            }
        }
        if (totalFlowOut > 0.0) {
            cell.armyStrength -= totalFlowOut;
        }
    }
    
    function stepCombat(cell) {
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
            var defenderCasualties = (totalAttack * CONFIG.CASUALTY_FACTOR) * Math.min(totalAttack / cell.armyStrength, 1);
            var attackerCasualties = (cell.armyStrength * CONFIG.CASUALTY_FACTOR) * Math.min(cell.armyStrength / totalAttack, 1);
            
            cell.armyStrength -= defenderCasualties;
            if (cell.armyStrength < 0.0) {
                cell.armyStrength = 0.0;
                cell.armyOwner = attackingCells[0].armyOwner;
                if (cell.generatorSpeed > 0.0) {
                    generatorsDirty = true;
                }
            }
            
            var a = attackerCasualties / attackingCells.length;
            for (var i = 0; i < attackingCells.length; i++) {
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
            tick++;
                    
            foreachCell(function(cell) {
                if (cell.generatorSpeed > 0) {
                    cell.armyStrength = Math.min(cell.armyStrength + cell.generatorSpeed, 1.0);
                }
                
                if (cell.armyStrength > 0  &&  cell.armyOwner >= 0  && cell.anyFlows()) {
                    flowCell(cell, thisTickMS);
                }
                return true;
            });
            
            // fight
            foreachCell(function(cell) {
                stepCombat(cell);
            });
            cellsDirty = true;
        }
    }

    function gameLoop(timeDelta, timeStamp) {
        doFPS(timeDelta, timeStamp);
        stepGameState(timeDelta, timeStamp);

        if (cellsDirty) {
            drawCells();
            cellsDirty = false;
        }
        
        if (flowsDirty) {
            drawFlows();
            flowsDirty = false;
        }
        
        if (generatorsDirty) {
            drawGens();
            generatorsDirty = false;
        }
        
        renderer.render(stage);
        requestAnimFrame(self.update);
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
            cellsDirty = true;
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
    };
    
    function drawFlow(graphic, startCell, endCell) {
        var w = 2;//Math.max(CONFIG.CELL_WIDTH / 20, 1);
        graphic.lineStyle(w, PLAYER_COLORS[PLAYER_INDEX], 0.8);
        graphic.moveTo(Cell.toCssMidX(startCell.xi), Cell.toCssMidY(startCell.yi));
        graphic.lineTo(Cell.toCssMidX(endCell.xi), Cell.toCssMidY(endCell.yi));
        graphic.beginFill(PLAYER_COLORS[PLAYER_INDEX], 0.8);
        graphic.drawCircle(Cell.toCssMidX(endCell.xi), Cell.toCssMidY(endCell.yi), 2);
    }
    
    function drawFlows() {
        flowContainer.removeChildren();
        var g = new PIXI.Graphics;
        foreachCell(function(cell) {
            for (var i = 0; i < 4; i++) {
                if (cell.flows[PLAYER_INDEX][i]) { // we only draw the player's flows
                    var toCell = getOffsetCell(cell, i);
                    if (toCell) {
                        drawFlow(g, cell, toCell);
                    }
                }
            }
        });
        flowContainer.addChild(g);
    }
    
    function initMap(mapData) {
        // Create the cells
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(1, mapData.lineColor, 1.0);
        cells = Array(Cell.prototype.XHi);
        for (var x = 0; x < Cell.prototype.XHi; x++) {
            cells[x] = Array(Cell.prototype.YHi);
            for (var y = 0; y < Cell.prototype.YHi; y++) {
                cells[x][y] = new Cell(x, y);
                var rgb = Array(3);
                for (var i = 0; i < 3; i++) {
                    rgb[i] = mapData.minColor[i] + (Math.random() * (mapData.maxColor[i] - mapData.minColor[i]));
                }
                graphics.beginFill((~~(rgb[0] << 16)) | (~~(rgb[1] << 8)) | ~~rgb[2], 1.0);
                graphics.drawRect(x * CONFIG.CELL_WIDTH, y * CONFIG.CELL_HEIGHT, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);
            }
        }
        cellContainer.addChildAt(graphics, 0);

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
            loader.onProgress = function() {};
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

        var newcss = "";
        if (newWidthToHeight > widthToHeight) {
            // window width is too wide relative to desired game width
            newWidth = newHeight * widthToHeight;
        } else { // window height is too high relative to desired game height
            newHeight = newWidth / widthToHeight;
        }
        newcss += "height: " + newHeight + "px; width: " + newWidth + "px; ";
        newcss += "margin-top: " + ((window.innerHeight - newHeight) / 2) + "px; ";
        newcss += "margin-left: " + ((window.innerWidth - newWidth) / 2) + "px;";

        document.getElementById("gamearea").style.cssText += newcss;
    }

    function setupGameState() {
        initMap(mapData);
    }


    return self.init();
})(CONFIG.X_RESOLUTION,
   CONFIG.Y_RESOLUTION);
