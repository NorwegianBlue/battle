function Base(x,y, owner, speed) {
    this.x = x;
    this.y = y;
    this.owner = (owner === undefined) ? -1 : owner; // unknown
    this.speedFactor = (speed === undefined) ? 1 : speed;
}


Base.prototype.isNeutral() {
    return this.owner < 0;
}
