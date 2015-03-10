net = (function() {
    var self = {

        socket: null,

        connect: function(address, port) {
            self.socket = new WebSocket("ws://"+address+":"+port);
            self.socket.onopen = function() {
                self.socket.send(JSON.stringify(netevents.announceReady()));
            };
            self.socket.onmessage = function(e) {
                /*
                   Handle event from other player
                 */
                //alert(e.data);
            };
            self.socket.onerror = function(e) {
                console.error("socket error " + e);
                try {
                    self.socket.close();
                }
                catch (e) {}
                self.socket = null;
            };
            return self.socket;
        },

        sendEvent: function(event) {
            self.socket.send(JSON.stringify(event));
        }
    };
    return self;
})();
