"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerEvents = void 0;
const Messages_1 = require("@Managers/Players/Messages");
var PlayerEvents;
(function (PlayerEvents) {
    function onIdlePlayer(queue) {
        setTimeout(() => {
            if (queue?.songs)
                isRemoveSong(queue);
            if (queue?.options?.random) {
                const RandomNumSong = Math.floor(Math.random() * queue.songs.length);
                queue.swapSongs(RandomNumSong);
            }
            return queue.play();
        }, 1200);
    }
    PlayerEvents.onIdlePlayer = onIdlePlayer;
    function onErrorPlayer(err, queue, isSkipSong) {
        Messages_1.MessagePlayer.toError(queue, err);
        setTimeout(() => {
            if (isSkipSong) {
                queue.songs.shift();
                setTimeout(queue.play, 1e3);
            }
        }, 1200);
    }
    PlayerEvents.onErrorPlayer = onErrorPlayer;
})(PlayerEvents = exports.PlayerEvents || (exports.PlayerEvents = {}));
function isRemoveSong({ options, songs }) {
    const { radioMode, loop } = options;
    if (radioMode || loop === "song")
        return;
    const shiftSong = songs.shift();
    if (loop === "songs")
        songs.push(shiftSong);
}
