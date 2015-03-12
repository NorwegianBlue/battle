net = (function() {
    var self = {

        socket: null,

        bytesSent: 0,
        messagesSent: 0,

        bytesReceived: 0,
        messagesReceived: 0,

        messageHandler: null,

        connect: function(address, port) {
            self.bytesSent = 0;
            self.messagesSent = 0;
            self.bytesReceived = 0;
            self.messagesReceived = 0;

            self.socket = new WebSocket("ws://"+address+":"+port);

            self.socket.onopen = function() {
                self.sendEvent(netevents.announceReady());
            };

            self.socket.onmessage = function(e) {
                /*
                   Handle event from other player
                 */
                //alert(e.data);

                self.messagesReceived++;
                self.bytesReceived += e.data.length;

                if (messageHandler) {
                    var message = JSON.parse(e.data);
                    game.handleMessage(message);
                }

                console.log("Received: ", message);
            };
            self.socket.onerror = function(e) {
                console.error("socket error: ", e);
                try {
                    self.socket.close();
                }
                catch (e) {}
                self.socket = null;
            };
            return self.socket;
        },

        sendEvent: function(event) {
            self.sendBytes(JSON.stringify(event));
        },

        sendBytes: function(s) {
            self.messagesSent++;
            self.bytesSent += s.length;
            self.socket.send(s);
        }
    };
    return self;
})();


lobbyevents = (function() {
    var self = {

    };

    function LobbyEvent(name) {
        var self = this;

        this.send = function send() {
            net.sendBytes("L" + JSON.stringify(self));
        }
    };

    return self;
})();
