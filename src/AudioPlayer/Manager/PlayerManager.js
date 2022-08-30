"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerEventsCallBacks = exports.PlayersManager = void 0;
const MessagePlayer_1 = require("./MessagePlayer");
const PlayerData = {
    players: [],
    timer: undefined,
    time: -1
};
var PlayersManager;
(function (PlayersManager) {
    function toPush(player) {
        if (PlayerData.players.includes(player))
            return;
        PlayerData.players.push(player);
        if (PlayerData.players.length === 1) {
            PlayerData.time = Date.now();
            setImmediate(playerCycleStep);
        }
    }
    PlayersManager.toPush = toPush;
    function toRemove(player) {
        const index = PlayerData.players.indexOf(player);
        if (index != -1)
            PlayerData.players.splice(index, 1);
        if (PlayerData.players.length === 0) {
            PlayerData.time = -1;
            if (typeof PlayerData.timer !== "undefined")
                clearTimeout(PlayerData.timer);
        }
    }
    PlayersManager.toRemove = toRemove;
    function playerCycleStep(players = null) {
        if (players === null) {
            if (PlayerData.time === -1)
                return;
            PlayerData.time += 20;
            const available = PlayerData.players.filter((player) => {
                if (player.state.status === "idle" || player.state.status === "buffering")
                    return false;
                if (!player.state.stream?.readable) {
                    player.state = { status: "idle" };
                    return false;
                }
                return true;
            });
            return playerCycleStep(available);
        }
        const nextPlayer = players.shift();
        if (!nextPlayer) {
            if (PlayerData.time !== -1) {
                PlayerData.timer = setTimeout(playerCycleStep, PlayerData.time - Date.now());
            }
            return;
        }
        nextPlayer["CheckStatusPlayer"]();
        setImmediate(() => playerCycleStep(players));
    }
})(PlayersManager = exports.PlayersManager || (exports.PlayersManager = {}));
var PlayerEventsCallBacks;
(function (PlayerEventsCallBacks) {
    function onIdlePlayer(queue) {
        setTimeout(() => {
            if (queue?.songs)
                isRemoveSong(queue);
            if (queue?.options?.random) {
                const RandomNumSong = Math.floor(Math.random() * queue.songs.length);
                queue.swapSongs(RandomNumSong);
            }
            return queue.player.play(queue);
        }, 500);
    }
    PlayerEventsCallBacks.onIdlePlayer = onIdlePlayer;
    function onErrorPlayer(err, queue) {
        MessagePlayer_1.MessagePlayer.toError(queue, queue.songs[0], err);
        queue.songs.shift();
        setTimeout(() => queue.player.play(queue), 1e3);
    }
    PlayerEventsCallBacks.onErrorPlayer = onErrorPlayer;
    function onBufferingPlayer(queue) {
        setTimeout(() => {
            if (queue.player.state.status === "buffering")
                MessagePlayer_1.MessagePlayer.toBuffering(queue, queue.songs[0]);
        }, 2e3);
    }
    PlayerEventsCallBacks.onBufferingPlayer = onBufferingPlayer;
    function isRemoveSong({ options, songs }) {
        switch (options?.loop) {
            case "song": return;
            case "songs": return void songs.push(songs.shift());
            default: return void songs.shift();
        }
    }
})(PlayerEventsCallBacks = exports.PlayerEventsCallBacks || (exports.PlayerEventsCallBacks = {}));
