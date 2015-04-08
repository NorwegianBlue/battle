var utils = require("./utils");

var CELLRES = 64;

var CONFIG = {
  CELL_WIDTH: CELLRES,
  CELL_HEIGHT: CELLRES,
  X_RESOLUTION: (8) * CELLRES + 1,
  Y_RESOLUTION: 12 * CELLRES + 1,

  SHOW_ENEMY_FLOWS: true,
  IDLE_FLOW_TIMEOUT_SEC: 30,

  PLAYER_JOIN_WAIT_SEC: 20,

  GAME_TICK_MS: 25,
  SYNC_MS: 500,
  GENERATOR_SPEED: 0.005,
  FLOW_RATE: 0.0125,
  CASUALTY_FACTOR: 0.007,

  SERVER_PORT: 443,
  SERVER_ADDRESS: "battle.regalement.com",
  NICKNAME: null,
  PLAYER_TEAM: -1,
  PLAYER_UUID: utils.UUID(),

  RENDER_OPTIONS: {
    antialias: true,
    resolution: window.devicePixelRatio
  }
};

module.exports = {
  CELLRES: CELLRES,
  CONFIG: CONFIG
};
