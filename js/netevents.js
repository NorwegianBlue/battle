netevents = (function() {
    var eventId = 0;

    var self = {

        netconnect: function() {
            var e = new NetEvent('connect');
            e.playeruuid = CONFIG.PLAYER_UUID;
            return e;
        },

        netdisconnect: function() {

        },

        pushsync: function(game) {
            var e = new NetEvent('pushsync');
            e.playeruuid = CONFIG.PLAYER_UUID;
            e.gameState = game.getState();
            return e;
        },

        flowconnect: function(x1,y1, x2,y2) {
            var e = new NetEvent('flowconnect');
            e.start = {x: x1, y: y1};
            e.end = {x: x2, y: y2};
            return e;
        },

        flowclear: function (x,y) {
            var e = new NetEvent('flowclear');
            e.cell = {x: x, y: y};
            return e;
        },

        announceReady: function() {
            var e = new NetEvent('ready');
            e.playeruuid = CONFIG.PLAYER_UUID;
            return e;
        }
    };

    function NetEvent(action) {
        this.id = eventId;
        this.action = action;
        this.playerid = CONFIG.PLAYER_ID;
        this.timestamp = Date.now();

        eventId++;
    }

    return self;
})();
