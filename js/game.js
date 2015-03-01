var cells;
game = (function(width, height) {
    var assetsToLoad = [
    ];

    var lastTime = 0;
    var nextTextUpdate = 2000; // 10 seconds
    var frameCount = 0;
    
    var stage;
    var renderer;

    var cellContainer;
    var baseContainer;
    var armyContainer;

    var textContainer;

    var redBase; // deprecated
    var blueBase; // deprecated

    var text;

    var moveBase = true;
    var moveBase2 = true;

    var redBases = [];
    var blueBases = [];

    var mapData;

    var self = {

        init: function () {
            var interactive = true;
            stage = new PIXI.Stage(0xFFFFFF, interactive);

            renderer = new PIXI.autoDetectRenderer(width, height, {antialias: true});
            renderer.view.id = "gamecanvas";
            renderer.view.style.display = "block";

            cellContainer = new PIXI.DisplayObjectContainer();
            baseContainer = new PIXI.DisplayObjectContainer();
            armyContainer = new PIXI.DisplayObjectContainer();
            textContainer = new PIXI.DisplayObjectContainer();

            window.addEventListener("resize", doResize);
            doResize();

            stage.addChild(cellContainer);
            stage.addChild(baseContainer);
            stage.addChild(armyContainer);

            redBase = new PIXI.Graphics();
            redBase.interactive = true;
            redBase.mousedown = redBase.touchstart = function(interactionData) {
                var gd = redBase.graphicsData[0];
                redBase.clear();
                redBase.lineStyle(1, 0xffffff, 0.8);
                redBase.beginFill(0xffffff, 0.8);
                redBase.drawRect(gd.shape.x, gd.shape.y, gd.shape.width, gd.shape.height);
            };
            baseContainer.addChild(redBase);

            blueBase = new PIXI.Graphics();
            baseContainer.addChild(blueBase);

            text = new PIXI.Text("", {font: "35px", fill: 'white'});
            text.position.x = 10;
            text.position.y = 10;
            cellContainer.addChild(text);

            return self;
        },

        run: function() {
            loadAssets(function() {
                document.getElementById("gamearea").appendChild(renderer.view);
                
                loadJSON("maps/map1.json",
                    function(data) {
                        mapData = data;
                        setupGameState();
                        self.update(0);
                    },
                    function(xhr) {
                        console.error(xhr);
                    }
                );
            });
        },

        update: function(now) {
            var delta = now - lastTime;
            gameLoop(delta, now);
            lastTime = now;
        }
    };

    function gameLoop(timeDelta, timeStamp) {
        if (timeStamp > nextTextUpdate) {
            nextTextUpdate = timeStamp + 2000;
            text.setText("" + (frameCount / 2.0).toFixed(0) + " fps");
            frameCount = 0;
        } else {
            frameCount++;
        }


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
            }, 2000);
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

    function foreachCell(fn) {
        for (var x = 0; x < cells.length; x++) {
            for (var y = 0; y < cells[x].length; y++) {
                fn(cells[x][y]);
            }
        }
    }
    
    function initGens(gens, color)
    {
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(2, color, 1.0);
        for (var i = 0; i < gens.length; i++) {
            graphics.drawCircle(
                gens[i].x * CONFIG.CELL_WIDTH + (CONFIG.CELL_WIDTH / 2), 
                gens[i].y * CONFIG.CELL_HEIGHT + (CONFIG.CELL_HEIGHT / 2),
                (CONFIG.CELL_WIDTH / 2) - 1
            );
        }
        baseContainer.addChild(graphics);
    }

    function initMap(mapData) {
        // Create the cells
        var graphics = new PIXI.Graphics();
        graphics.lineStyle(1, mapData.lineColor, 1.0);
        cells = Array(Cell.prototype.XHi);
        for(var x = 0; x < Cell.prototype.XHi; x++ ) {
            cells[x] = Array(Cell.prototype.YHi);
            for (var y = 0; y < Cell.prototype.YHi; y++ ) {
                cells[x][y] = new Cell(x,y);
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
        var blueGens = mapData.generators[0];
        var redGens = mapData.generators[1];
        
        initGens(blueGens, 0x0000ff);
        initGens(redGens, 0xff0000);
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
        newcss += "margin-left: " + ((window.innerWidth - newWidth) / 2) + "px;";

        gamearea.style.cssText += newcss;
    }

    function setupGameState() {
        initMap(mapData);
    }


    return self.init();
})(CONFIG.X_RESOLUTION,
   CONFIG.Y_RESOLUTION);
