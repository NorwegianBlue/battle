var CONFIG = require("./config").CONFIG;

netevents = (function () {
  var eventId = 0;

  var self = {

    netconnect: function () {
      var e = new NetEvent('connect');
      e.playeruuid = CONFIG.PLAYER_UUID;
      return e;
    },

    netdisconnect: function () {

    },

    whoishere: function () {
      var e = new NetEvent('whoishere');
      e.playeruuid = CONFIG.PLAYER_UUID;
      e.nickname = CONFIG.NICKNAME;
      return e;
    },

    pingpeer: function () {
      var e = new NetEvent('pingpeer');
      e.playeruuid = CONFIG.PLAYER_UUID;
      return e;
    },

    pingresponse: function (sentAt, respondTo) {
      var e = new NetEvent('pingresponse');
      e.pingStart = sentAt;
      e.respondTo = respondTo;
      e.responseFrom = CONFIG.PLAYER_UUID;
      return e;
    },

    pushsync: function (game) {
      var e = new NetEvent('pushsync');
      e.playeruuid = CONFIG.PLAYER_UUID;
      e.syncData = game.getSyncData();
      return e;
    },

    sync: function (cells) {
      var e = new NetEvent('sync');
      e.cells = cells;
      return e;
    },

    flowconnect: function (x1, y1, x2, y2) {
      var e = new NetEvent('flowconnect');
      e.start = {x: x1, y: y1};
      e.end = {x: x2, y: y2};
      return e;
    },

    flowclear: function (x, y) {
      var e = new NetEvent('flowclear');
      e.cell = {x: x, y: y};
      return e;
    },

    announceReady: function () {
      var e = new NetEvent('ready');
      e.playeruuid = CONFIG.PLAYER_UUID;
      return e;
    }
  };

  function NetEvent(action) {
    var self = this;
    this.id = eventId;
    this.action = action;
    this.team = CONFIG.PLAYER_TEAM;
    this.timestamp = Date.now();

    eventId++;

    this.send = function () {
      net.sendEvent(self);
    };
  }

  return self;
})();

module.exports = netevents;
