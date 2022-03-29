"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstFormat = exports.Song = void 0;
const ParserTimeSong_1 = require("../../Functions/ParserTimeSong");
const Colors_1 = require("../../../../../../Core/Utils/Colors");
class Song {
    constructor(track, { author }) {
        const type = Type(track.url);
        this.id = track.id;
        this.title = track.title;
        this.url = track.url;
        this.author = track.author;
        this.duration = ConstDuration(track.duration);
        this.image = track.image;
        this.requester = author;
        this.isLive = track.isLive;
        this.color = Color(type);
        this.type = type;
        this.format = ConstFormat(track.format);
    }
    ;
}
exports.Song = Song;
function ConstDuration(duration) {
    const seconds = parseInt(duration.seconds);
    return {
        seconds, StringTime: seconds > 0 ? (0, ParserTimeSong_1.ParserTimeSong)(seconds) : 'Live'
    };
}
function Color(type) {
    return type === "YOUTUBE" ? Colors_1.Colors.RED : type === "SPOTIFY" ? Colors_1.Colors.GREEN : Colors_1.Colors.BLUE;
}
function Type(url) {
    try {
        let start = url.split('://')[1].split('/')[0];
        let split = start.split(".");
        return (split[split.length - 2]).toUpperCase();
    }
    catch {
        return "UNKNOWN";
    }
}
function ConstFormat(format) {
    if (!format)
        return null;
    return {
        url: format.url,
        work: format?.work
    };
}
exports.ConstFormat = ConstFormat;
