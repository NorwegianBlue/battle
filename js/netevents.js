netevents = (function() {
    var eventId = 0;

    var self = {

        netconnect: function() {
            var e = new NetEvent('connect');
            this.playeruuid = CONFIG.PLAYER_UUID;
            return e;
        },

        netdisconnect: function() {

        },

        flowconnect: function(startCell, endCell) {
            var e = new NetEvent('flowconnect');
            e.start = {x: startCell.xi, y: startCell.yi};
            e.end = {x:endCell.xi, y: endCell.yi};
            return e;
        },

        flowclear: function (cell) {
            var e = new NetEvent('flowclear');
            e.cell = {x: cell.xi, y: cell.yi};
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
