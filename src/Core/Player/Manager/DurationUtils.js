"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserTime = exports.ParseTimeString = exports.TimeInArray = exports.NumberString = void 0;
const Queue_1 = require("../Structures/Queue/Queue");
function NumberString(duration) {
    return (duration < 10) ? ('0' + duration) : duration;
}
exports.NumberString = NumberString;
function TimeInArray(queue) {
    let Timer = 0;
    if (queue instanceof Queue_1.Queue)
        queue.songs.map((song) => Timer += song.duration.seconds);
    else
        queue.map((song) => Timer += parseInt(song.duration.seconds));
    return ParseTimeString(Timer);
}
exports.TimeInArray = TimeInArray;
function ParseTimeString(duration) {
    let days = toStringTime(duration / ((60 * 60) * 24) % 24);
    let hours = toStringTime(duration / (60 * 60) % 24);
    let minutes = toStringTime((duration / 60) % 60);
    let seconds = toStringTime(duration % 60);
    return (days > 0 ? `${days}:` : '') + (hours > 0 || days > 0 ? `${hours}:` : '') + (minutes > 0 ? `${minutes}:` : '00:') + (seconds > 0 ? `${seconds}` : '00');
}
exports.ParseTimeString = ParseTimeString;
function ParserTime(duration) {
    const Splitter = duration?.split(":");
    if (Splitter.length === 4) {
        const days = Number(Splitter[0]) * ((60 * 60) * 24);
        const hours = Number(Splitter[1]) * (60 * 60);
        const minutes = (Number(Splitter[2]) * 60);
        const seconds = Number(Splitter[3]);
        return days + hours + minutes + seconds;
    }
    else if (Splitter.length === 3) {
        const hours = Number(Splitter[0]) * (60 * 60);
        const minutes = (Number(Splitter[1]) * 60);
        const seconds = Number(Splitter[2]);
        return hours + minutes + seconds;
    }
    else if (Splitter.length === 2) {
        const minutes = (Number(Splitter[0]) * 60);
        const seconds = Number(Splitter[1]);
        return minutes + seconds;
    }
    return Number(duration);
}
exports.ParserTime = ParserTime;
function toStringTime(duration) {
    return NumberString(duration.toFixed(0));
}
