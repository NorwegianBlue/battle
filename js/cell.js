function Cell(x,y, pixiRect) {
    this.xi = x;
    this.yi = y;

    this.flows = Array(2);
    this.flows[0] = Array[4];
    this.flows[1] = Array[4];
    
    this.armyStrength = 0.0;
    this.armyOwner = -1;
}

Cell.FLOW_UP = 0;
Cell.FLOW_RIGHT = 1;
Cell.FLOW_DOWN = 2;
Cell.FLOW_LEFT = 3;

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


Cell.prototype.XHi = ~~(CONFIG.X_RESOLUTION / CONFIG.CELL_WIDTH);
Cell.prototype.YHi = ~~(CONFIG.Y_RESOLUTION / CONFIG.CELL_HEIGHT);

Cell.prototype.xpos = function() {
    return this.xi * CONFIG.CELL_WIDTH;
};

Cell.prototype.ypos = function() {
    return this.yi * CONFIG.CELL_HEIGHT;
};

Cell.prototype.anyFlows = function(owner) {
    for (var i = 0; i < this.flows[owner].length; i++) {
        if (this.flows[owner][i] !== undefined) {
            return true;
        }
    }
    return false;
};

Cell.prototype.toCssBoundsRect = function() {
    return Cell.toCssBoundsRect(this.xi, this.yi);
};
