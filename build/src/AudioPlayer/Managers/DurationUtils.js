"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DurationUtils = void 0;
const Queue_1 = require("@Queue/Queue");
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
        const days = toFixed0(duration / ((60 * 60) * 24) % 24);
        const hours = toFixed0(duration / (60 * 60) % 24);
        const minutes = toFixed0((duration / 60) % 60);
        const seconds = toFixed0(duration % 60);
        return (days > 0 ? `${days}:` : "") + (hours > 0 || days > 0 ? `${hours}:` : "") + (minutes > 0 ? `${minutes}:` : "00:") + (seconds > 0 ? `${seconds}` : "00");
    }
    DurationUtils.ParsingTimeToString = ParsingTimeToString;
    function ParsingTimeToNumber(duration) {
        if (typeof duration === "number")
            return duration;
        const Splitter = duration?.split(":");
        const days = (duration) => Number(duration) * ((60 * 60) * 24);
        const hours = (duration) => Number(duration) * ((60 * 60) * 24);
        const minutes = (duration) => (Number(duration) * 60);
        const seconds = (duration) => Number(duration);
        if (!Splitter?.length)
            return Number(duration);
        switch (Splitter.length) {
            case 4: return days(Splitter[0]) + hours(Splitter[1]) + minutes(Splitter[2]) + seconds(Splitter[3]);
            case 3: return hours(Splitter[0]) + minutes(Splitter[1]) + seconds(Splitter[2]);
            case 2: return minutes(Splitter[0]) + seconds(Splitter[1]);
        }
    }
    DurationUtils.ParsingTimeToNumber = ParsingTimeToNumber;
    function toFixed0(duration) {
        const fixed = parseInt(duration);
        return (fixed < 10) ? ("0" + fixed) : fixed;
    }
    DurationUtils.toFixed0 = toFixed0;
})(DurationUtils = exports.DurationUtils || (exports.DurationUtils = {}));
