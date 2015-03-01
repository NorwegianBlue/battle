function Army(x,y, owner) {
    this.x = x;
    this.y = y;
    this.owner = owner;
}

Army.prototype.isEmpty = function() {
    return (owner < 0);
}

Army.prototype.constructor = Army;