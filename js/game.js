var cells;
game = (function(width, height) {
    var assetsToLoad = [

    ];

    var lastTime = 0;

    var stage;
    var renderer;

    var cellContainer;
    var baseContainer;
    var armyContainer;

    var moveBase = false;
    var moveBase2 = false;

    var redBase;
    var blueBase;

    var self = {

        init: function () {
            stage = new PIXI.Stage(0xFFFFFF, true);
            stage.interactive = true;

            renderer = new PIXI.autoDetectRenderer(width, height);
            renderer.view.id = "gamecanvas";
            renderer.view.style.display = "block";

            cellContainer = new PIXI.DisplayObjectContainer();
            baseContainer = new PIXI.DisplayObjectContainer();
            armyContainer = new PIXI.DisplayObjectContainer();

            window.addEventListener("resize", doResize);
            doResize();
            //window.screen.orientation.lock("portrait").catch(function(){});

            stage.addChild(cellContainer);
            stage.addChild(baseContainer);
            stage.addChild(armyContainer);

            redBase = new PIXI.Graphics();
            redBase.interactive = true;
            redBase.click = redBase.tap = function(interactionData) {
                redBase.graphicsData[0].fillColor = 0xffff00;
                redBase.graphicsData[0].fillAlpha = 1.0;
            };
            baseContainer.addChild(redBase);

            blueBase = new PIXI.Graphics();
            baseContainer.addChild(blueBase);

            return self;
        },

        run: function() {
            loadAssets(function() {
                document.getElementById("gamearea").appendChild(renderer.view);
                setupGameState();
                lastTime = new Date().getTime();

                moveBase = true;
                moveBase2 = true;

                self.update();
            });
        },

        update: function(timestamp) {
            var elapsed = (timestamp - lastTime);
            lastTime = timestamp;

            if (moveBase) {
                var basex = ~~(Math.random() * cells.length),
                    basey = ~~(Math.random() * cells[0].length);
                moveBase = false;

                redBase.clear();
                redBase.lineStyle(1, 0xff0000, 1.0);
                redBase.beginFill(0xff0000, 0.5);
                redBase.drawRect(basex * CONFIG.CELL_WIDTH, basey * CONFIG.CELL_HEIGHT, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

                window.setTimeout(function() {
                    moveBase = true;
                }, 1000);
            }

            if (moveBase2) {
                var basex = ~~(Math.random() * cells.length),
                    basey = ~~(Math.random() * cells[0].length);
                moveBase2 = false;

                blueBase.clear();
                blueBase.lineStyle(1, 0x0000ff, 1.0);
                blueBase.beginFill(0x0000ff, 0.7);
                blueBase.drawRect(basex * CONFIG.CELL_WIDTH, basey * CONFIG.CELL_HEIGHT, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);

                window.setTimeout(function() {
                    moveBase2 = true;
                }, 330);
            }

            renderer.render(stage);
            requestAnimFrame(self.update);
        }
    };

    function foreachCell(fn) {
        for (var x = 0; x < cells.length; x++) {
            for (var y = 0; y < cells[x].length; y++) {
                fn(cells[x][y]);
            }
        }
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
        var gamearea = document.getElementById("gamearea");

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
        newcss += "margin-left: " + ((window.innerWidth - newWidth) / 2) + "px";

        gamearea.style.cssText += newcss;
    }

    function setupGameState() {
        // Create the cells
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(1, 0x00ff00, 1.0);
        cells = Array(Cell.prototype.XHi);
        for(var x = 0; x < Cell.prototype.XHi; x++ ) {
            cells[x] = Array(Cell.prototype.YHi);
            for (var y = 0; y < Cell.prototype.YHi; y++ ) {
                cells[x][y] = new Cell(x,y);
                graphics.beginFill(~~(Math.random() * (0xff/2) + (0xff/2)) << 8, 1.0);
                graphics.drawRect(x * CONFIG.CELL_WIDTH, y * CONFIG.CELL_HEIGHT, CONFIG.CELL_WIDTH, CONFIG.CELL_HEIGHT);
            }
        }
        cellContainer.addChild(graphics);
    };


    return self.init();
})(CONFIG.X_RESOLUTION,
   CONFIG.Y_RESOLUTION);
