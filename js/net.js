net = (function() {
    var self = {

        socket: null,

        bytesSent: 0,
        messagesSent: 0,

        bytesReceived: 0,
        messagesReceived: 0,

        messageHandler: null,

        connect: function(address, port, callback) {
            self.bytesSent = 0;
            self.messagesSent = 0;
            self.bytesReceived = 0;
            self.messagesReceived = 0;

            self.socket = new WebSocket("ws://"+address+":"+port);

            self.socket.onopen = callback;

            self.socket.onmessage = function(e) {
                self.messagesReceived++;
                self.bytesReceived += e.data.length;

                if (self.messageHandler) {
                    self.messageHandler(JSON.parse(e.data));
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

        disconnect: function() {
            if (self.socket) {
                self.socket.close();
            }
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
