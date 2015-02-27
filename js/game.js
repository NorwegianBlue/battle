var cells;
game = (function(width, height) {
    var assetsToLoad = [

    ];

    var stage;
    var renderer;

    var cellContainer;


    var self = {
        init: function () {
            stage = new PIXI.Stage(0xFFFFFF, true);
            stage.interactive = true;

            renderer = new PIXI.autoDetectRenderer(width, height);
            renderer.view.id = "gamecanvas";
            renderer.view.style.display = "block";

            cellContainer = new PIXI.DisplayObjectContainer();

            window.addEventListener("resize", doResize);
            doResize();
            //window.screen.orientation.lock("portrait").catch(function(){});

            stage.addChild(cellContainer);

            return self;
        },

        run: function() {
            loadAssets(function() {
                document.getElementById("gamearea").appendChild(renderer.view);
                setupGameState();
                self.update();
            });
        },

        update: function() {
            requestAnimFrame(self.update);

            renderer.render(stage);
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
        graphics.lineStyle(1, 0x00ff00);
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
