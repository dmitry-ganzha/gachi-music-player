"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstFormat = exports.Song = void 0;
const LiteUtils_1 = require("../../../Utils/LiteUtils");
const DurationUtils_1 = require("../../Manager/DurationUtils");
class Song {
    constructor(track, { author }) {
        const type = Type(track.url);
        this.title = track.title;
        this.url = track.url;
        this.author = {
            url: track.author.url, title: track.author.title, image: track.author.image, isVerified: track.author.isVerified
        };
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
        seconds, StringTime: seconds > 0 ? (0, DurationUtils_1.ParseTimeString)(seconds) : 'Live'
    };
}
function Color(type) {
    if (type === "YOUTUBE")
        return LiteUtils_1.Colors.RED;
    else if (type === "SPOTIFY")
        return LiteUtils_1.Colors.GREEN;
    else if (type === 'SOUNDCLOUD')
        return LiteUtils_1.Colors.ORANGE;
    return LiteUtils_1.Colors.BLUE;
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
