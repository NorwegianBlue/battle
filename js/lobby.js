function Player(nickname) {
    this.nickname = nickname;
    this.address = address;
    this.state = Player.IDLE;
}

Player.IDLE = 0;
Player.INLOBBY = 1;
Player.INGAME = 2;


lobby = (function() {
    var self = {
        join: function(nickname) {
            //join lobby with nickname
        },

        who: function() {
            // return a list of nicknames
            return [];
        }
    };
    return self;
})();
