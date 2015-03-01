var cells;
var message = "";

CLICK_FEEDBACK_MS = 300;

/* Constants */
RED_INDEX = 0;
BLUE_INDEX = 1;

PLAYER_COLORS = [0xee0000, 0x0000ff];
PLAYER_COLORS2 = [0xff6666, 0x9999ff];

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
    var frameStart;

    var stage;
    var renderer;

    var cellContainer;
    var baseContainer;
    var armyContainer;
    
    var topContainer;

    var textContainer;

    var text;
//    var message;
    var textDirty = false;
    
    var generators = [];
    var generatorsDirty = true;
    
    var armies = [];
    var armiesDirty = true;
    
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
            textContainer = new PIXI.DisplayObjectContainer();
            
            topContainer = new PIXI.DisplayObjectContainer();

            window.addEventListener("resize", doResize);
            doResize();

            stage.addChild(cellContainer);
            stage.addChild(baseContainer);
            stage.addChild(armyContainer);
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

            text = new PIXI.Text("", {font: "20px Roboto,Arial", fill: 'white'});
            text.position.x = 10;
            text.position.y = 10;
            cellContainer.addChild(text);
            
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
    
    function handleClickComplete(firstCell, secondCell) {
        var army;
        foreachArmy(function(a){
            if (firstCell.xi === a.x && firstCell.yi === a.y) {
                army = a;
                return false;
            }
            return true;
        });
        if (army !== undefined) {
            army.x = secondCell.xi;
            army.y = secondCell.yi;
            armiesDirty = true;
        }        
    }

    function doFPS(timeDelta, timeStamp) {
        if (timeStamp > nextTextUpdate  ||  textDirty) {
            nextTextUpdate = timeStamp + 1000;
            text.setText(
                mapData.title + "\n"
                + (frameCount / ((timeStamp - frameStart) / 1000.0)).toFixed(0) + " fps"
                + ((message != "") ? ("\n" + message) : "")
                + "\ninputMode: " + inputMode
            );
            frameCount = 0;
            frameStart = timeStamp;
            textDirty = false;
        } else {
            frameCount++;
        }
    }

    function stepGameState(timeDelta, timeStamp) {
        if (inputMode === InputModes.DEST_CLICK_FEEDBACK_DELAY  &&  timeStamp >= destClickFeedbackOff) {
            topContainer.removeChildren();
            setInputMode(InputModes.IDLE);
        }
    }

    function gameLoop(timeDelta, timeStamp) {
        doFPS(timeDelta, timeStamp);
        stepGameState(timeDelta, timeStamp);

        if (generatorsDirty) {
            drawGens();
            generatorsDirty = false;
        }
        
        if (armiesDirty) {
            drawArmies();
            armiesDirty = false;
        }

        /*
        if (moveBase) {
            var basex = ~~(Math.random() * cells.length),
                basey = ~~(Math.random() * cells[0].length);
            moveBase = false;

            redBase.clear();
            redBase.lineStyle(1, 0xff0000, 1.0);
            redBase.beginFill(0xff0000, 0.5);
            redBase.drawRect(basex * CONFIG.CELL_WIDTH, basey * CONFIG.CELL_HEIGHT, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

            window.setTimeout(function () {
                moveBase = true;
            }, 2000);
        }

        if (moveBase2) {
            var basex = ~~(Math.random() * cells.length),
                basey = ~~(Math.random() * cells[0].length);
            moveBase2 = false;

            blueBase.clear();
            blueBase.lineStyle(1, 0x0000ff, 1.0);
            blueBase.beginFill(0x3333ff, 0.7);
            blueBase.drawRect(basex * CONFIG.CELL_WIDTH, basey * CONFIG.CELL_HEIGHT, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

            window.setTimeout(function () {
                moveBase2 = true;
            }, 425);
        }
        */

        renderer.render(stage);
        requestAnimFrame(self.update);
    }

    function foreachCell(fn) {
        for (var x = 0; x < cells.length; x++) {
            for (var y = 0; y < cells[x].length; y++) {
                if (!fn(cells[x][y])) {
                    return;
                }
            }
        }
    }
    
    function foreachArmy(fn) {
        for (var i = 0; i < armies.length; i++) {
            if (!fn(armies[i])) {
                return;
            }
        }
    }
    
    function foreachBase(fn) {
        for (var i = 0; i < generators.length; i++) {
            if (!fn(generators)) {
                return;
            }
        }
    }

    function initGens(gens, color) {
        if (mapData.generators === undefined) {
            return;
        }
        generators = Array(mapData.generators);
        
        for (var i = 0; i < mapData.generators.length; i++) {
            generators[i] = new Base(
                mapData.generators[i].x,
                mapData.generators[i].y,
                mapData.generators[i].owner,
                mapData.generators[i].speedFactor
            );
        }
    }

    function initArmies() {
        if (mapData.armies === undefined) {
            return;
        }
        armies = Array(mapData.armies);

        for (var i = 0; i < mapData.armies.length; i++) {
            armies[i] = new Army(mapData.armies[i].x, mapData.armies[i].y, mapData.armies[i].owner);
        }
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
        drawArmies();
    }
    
    function getBaseShape(base) {
        return new PIXI.Circle(
            Cell.toCssMidX(base.x),
            Cell.toCssMidY(base.y),
            (CONFIG.CELL_WIDTH / 2) -1
        );
    }

    function drawGens() {
        baseContainer.removeChildren();
        var g = new PIXI.Graphics();
        for (var i = 0; i < generators.length; i++) {
            g.lineStyle(2, PLAYER_COLORS[generators[i].owner], 1.0);
            g.drawShape(getBaseShape(generators[i]));
        }
        baseContainer.addChild(g);
    }
    
    function getArmyShape(army) {
        var INSET = 4;
        return new PIXI.Rectangle(
            Cell.toCssX(army.x)+INSET,
            Cell.toCssY(army.y)+INSET,
            CONFIG.CELL_WIDTH-INSET*2,
            CONFIG.CELL_HEIGHT-INSET*2
        );
    }
    
    function drawArmies() {
        armyContainer.removeChildren();
        var g = new PIXI.Graphics();
        for(var i = 0; i < armies.length; i++) {
            var owner = armies[i].owner;
            g.lineStyle(1, PLAYER_COLORS2[owner], 1.0);
            g.beginFill(PLAYER_COLORS[owner], 1.0);
            g.drawShape(getArmyShape(armies[i]));
        }
        armyContainer.addChild(g);
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
