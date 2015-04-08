var Tween = require("tween.js"),
    CONFIG = require("./config").CONFIG,
    utils = require("./utils"),
    game = require("./game").game,
    gameData = require("./game").gameData,
    net = require("./net");


(function start() {
    function onTeamClick(e) {
        $(e.toElement).siblings().removeClass("active");
        $(e.toElement).addClass("active");

        $("#nickname").val($(e.toElement).html());
    }

    $("#playerTop").click(onTeamClick);
    $("#playerBottom").click(onTeamClick);

    $("#btnConnectCancel").click(function() {
        gameData.state = gameState.ENDED;
        window.cancelAnimationFrame(animFrameId);
        $(".page").hide();
        $("#server").show();
    });

    $(".page").hide();

    p = utils.getUrlParams(location.search);

    $("#submitBtn").click(function() {
        CONFIG.SERVER_ADDRESS = document.getElementById("serverAddress").value;
        CONFIG.NICKNAME = document.getElementById("nickname").value;
        if ($("#playerTop").hasClass("active")) {
            CONFIG.PLAYER_TEAM = 0;
        } else {
            CONFIG.PLAYER_TEAM = 1;
        }

        $("#server").hide();
        $("#connecting").show();

        game.run();
    });

    $("#btnReset").click(function() {
        window.cancelAnimationFrame(animFrameId);
        game.resetGame();
        $(".page").hide();
        $("#server").show();
    });

    $("#btnPushSync").click(function() {
        game.pushSync();
    });

    $("#btnWin").click(function() {
        game.gameover(+1);
    });

    $("#btnLose").click(function() {
        game.gameover(-1);
    });

    if (p['server'] !== undefined) {
        CONFIG.SERVER_ADDRESS = p['server'];
    }

    if (p['team'] !== undefined) {
        CONFIG.PLAYER_TEAM = parseInt(p['team'], 10);
    }

    if (p['nickname'] !== undefined) {
        CONFIG.NICKNAME = p['nickname'];
    }

    if (p['debug'] === "1") {
        CONFIG.debug = true;
        $("body").append("<br />Debug mode");
    }

    document.getElementById("playerTop").checked = (CONFIG.PLAYER_TEAM === 0);
    document.getElementById("playerBottom").checked = (CONFIG.PLAYER_TEAM !== 0);

    document.getElementById("serverAddress").value = CONFIG.SERVER_ADDRESS;

    if (CONFIG.NICKNAME === null) {
        if (typeof device === 'undefined') {
            document.getElementById("nickname").value = CONFIG.NICKNAME;
        } else {
            document.getElementById("nickname").value = device.model;
        }
    } else {
        document.getElementById("nickname").value = CONFIG.NICKNAME;
    }

    if (p['run'] !== undefined) {
        s = net.connect(CONFIG.SERVER_ADDRESS, CONFIG.SERVER_PORT);
        game.init().run();
        document.getElementById("gamearea").style.display = "block";
    } else {
        $("#server").show();
    }
})();
