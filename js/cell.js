function Cell(x,y, pixiRect) {
    this.xi = x;
    this.yi = y;

    this.flows = new Array(2);
    this.flows[0] = new Array(4);
    this.flows[1] = new Array(4);

    this.flowed = new Array(2);
    this.flowed[0] = new Array(4);
    this.flowed[1] = new Array(4);
        
    this.armyStrength = 0.0;
    this.armyOwner = -1;
    
    this.generatorSpeed = 0.0;
    this.lastSync = Date.now();
    this.lastChange = 0;
}

Cell.FLOW_UP = 0;
Cell.FLOW_RIGHT = 1;
Cell.FLOW_DOWN = 2;
Cell.FLOW_LEFT = 3;

Cell.UP = 0;
Cell.RIGHT = 1;
Cell.DOWN = 2;
Cell.LEFT = 3;

Cell.toCssX = function(x) {
    return x * CONFIG.CELL_WIDTH;
};

Cell.toCssY = function(y) {
    return y * CONFIG.CELL_HEIGHT;
};

Cell.toCssMidX = function(x) {
    return (x * CONFIG.CELL_WIDTH) + (CONFIG.CELL_WIDTH / 2);
};

Cell.toCssMidY = function(y) {
    return (y * CONFIG.CELL_HEIGHT) + (CONFIG.CELL_HEIGHT / 2);
};

Cell.toCssBoundsRect = function(x,y) {
    return new PIXI.Rectangle(
        Cell.toCssX(x),
        Cell.toCssY(y),
        CONFIG.CELL_WIDTH,
        CONFIG.CELL_HEIGHT
    );
};

Cell.fromCss = function(x,y) {
    return new PIXI.Point(~~(x / CONFIG.CELL_WIDTH), ~~(y / CONFIG.CELL_HEIGHT));
}


Cell.XHi = ~~(CONFIG.X_RESOLUTION / CONFIG.CELL_WIDTH);
Cell.YHi = ~~(CONFIG.Y_RESOLUTION / CONFIG.CELL_HEIGHT);

Cell.prototype.sync = function(syncFrom) {
    /*
    for (var team = 0; team < 2; team++) {
        for (var direction = 0; direction < 4; direction++) {
            this.flows[team][direction] = syncFrom.flows[team][direction];
        }
    }
    */
    this.armyStrength = syncFrom.armyStrength;
    this.armyOwner = syncFrom.armyOwner;
    this.lastSync = Date.now();
    this.lastChange = 0;
};

Cell.prototype.xpos = function() {
    return this.xi * CONFIG.CELL_WIDTH;
};

Cell.prototype.ypos = function() {
    return this.yi * CONFIG.CELL_HEIGHT;
};

Cell.prototype.anyFlows = function() {
    for (var owner = 0; owner < 2; owner++ ) {
        for (var i = 0; i < this.flows[owner].length; i++) {
            if (this.flows[owner][i] !== undefined) {
                return true;
            }
        }
    }
    return false;
};

Cell.prototype.toCssBoundsRect = function() {
    return Cell.toCssBoundsRect(this.xi, this.yi);
};

PIXI.Rectangle.prototype.inflateRect = function(w,h) {
    this.x -= w;
    this.y -= h;
    this.width += w*2;
    this.height += w*2;
    return this;
};
