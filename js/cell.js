function Cell(x,y, pixiRect) {
    this.xi = x;
    this.yi = y;
    this.contents = {};
}

Cell.prototype.XHi = ~~(CONFIG.X_RESOLUTION / CONFIG.CELL_WIDTH);
Cell.prototype.YHi = ~~(CONFIG.Y_RESOLUTION / CONFIG.CELL_HEIGHT);

Cell.prototype.xpos = function() {
    return this.xi * CONFIG.CELL_WIDTH;
}

Cell.prototype.ypos = function() {
    return this.yi * CONFIG.CELL_HEIGHT;
}