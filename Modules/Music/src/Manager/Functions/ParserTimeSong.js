"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParserTimeSong = void 0;
const StringTime_1 = require("./StringTime");
function ParserTimeSong(duration) {
    let days = toStringTime(duration / ((60 * 60) * 24) % 24);
    let hours = toStringTime(duration / (60 * 60) % 24);
    let minutes = toStringTime((duration / 60) % 60);
    let seconds = toStringTime(duration % 60);
    return (days > 0 ? `${days}:` : '') + (hours > 0 || days > 0 ? `${hours}:` : '') + (minutes > 0 ? `${minutes}:` : '00:') + (seconds > 0 ? `${seconds}` : '00');
}
exports.ParserTimeSong = ParserTimeSong;
function toStringTime(duration) {
    return (0, StringTime_1.StringTime)(parseInt(String(duration)));
}
