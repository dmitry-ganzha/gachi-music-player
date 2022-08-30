"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DurationUtils = void 0;
const Queue_1 = require("../Structures/Queue/Queue");
var DurationUtils;
(function (DurationUtils) {
    function getTimeQueue(queue) {
        let Timer = 0;
        if (queue instanceof Queue_1.Queue)
            queue.songs.forEach((song) => Timer += song.duration.seconds);
        else
            queue.forEach((song) => Timer += parseInt(song.duration.seconds));
        return ParsingTimeToString(Timer);
    }
    DurationUtils.getTimeQueue = getTimeQueue;
    function ParsingTimeToString(duration) {
        let days = toStringTime(duration / ((60 * 60) * 24) % 24);
        let hours = toStringTime(duration / (60 * 60) % 24);
        let minutes = toStringTime((duration / 60) % 60);
        let seconds = toStringTime(duration % 60);
        return (days > 0 ? `${days}:` : "") + (hours > 0 || days > 0 ? `${hours}:` : "") + (minutes > 0 ? `${minutes}:` : "00:") + (seconds > 0 ? `${seconds}` : "00");
    }
    DurationUtils.ParsingTimeToString = ParsingTimeToString;
    function ParsingTimeToNumber(duration) {
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
    DurationUtils.ParsingTimeToNumber = ParsingTimeToNumber;
})(DurationUtils = exports.DurationUtils || (exports.DurationUtils = {}));
function toStringTime(duration) {
    return NumberString(parseInt(duration));
}
function NumberString(duration) {
    return (duration < 10) ? ("0" + duration) : duration;
}
