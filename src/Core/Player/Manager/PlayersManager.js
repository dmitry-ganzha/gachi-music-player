"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAudioPlayer = exports.addAudioPlayer = void 0;
const audioPlayers = [];
let AudioCycleTimer;
let TimeToFrame = -1;
function addAudioPlayer(player) {
    if (audioPlayers.includes(player))
        return;
    audioPlayers.push(player);
    if (audioPlayers.length === 1) {
        TimeToFrame = Date.now();
        setImmediate(audioCycleStep);
    }
}
exports.addAudioPlayer = addAudioPlayer;
function deleteAudioPlayer(player) {
    const index = audioPlayers.indexOf(player);
    if (index === -1)
        return;
    audioPlayers.splice(index, 1);
    if (audioPlayers.length === 0) {
        TimeToFrame = -1;
        if (typeof AudioCycleTimer !== 'undefined')
            clearTimeout(AudioCycleTimer);
    }
}
exports.deleteAudioPlayer = deleteAudioPlayer;
function audioCycleStep() {
    if (TimeToFrame === -1)
        return;
    TimeToFrame += 20;
    const available = audioPlayers.filter((player) => player.checkPlayable);
    return prepareNextAudioFrame(available);
}
function prepareNextAudioFrame(players) {
    const nextPlayer = players.shift();
    if (!nextPlayer) {
        if (TimeToFrame !== -1)
            AudioCycleTimer = setTimeout(audioCycleStep, TimeToFrame - Date.now());
        return;
    }
    nextPlayer['CheckStatusPlayer']();
    setImmediate(() => prepareNextAudioFrame(players));
}
