"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FindResource = void 0;
const Song_1 = require("../Structures/Queue/Song");
const httpsClient_1 = require("../../httpsClient");
const Platforms_1 = require("../../Platforms");
const DurationUtils_1 = require("../Manager/DurationUtils");
const GlobalOptions = { request: { maxRedirections: 10, method: "GET" } };
async function FindResource(song) {
    if (!song.format || !song.format.url) {
        let format = await getLinkFormat(song);
        if (!format || !format?.url)
            throw Error("Has not found format");
        song.format = (0, Song_1.ConstFormat)(format);
        const resource = await httpsClient_1.httpsClient.Request(song.format?.url, GlobalOptions);
        if (resource instanceof Error) {
            delete song.format;
            throw Error(`Failed checking link resource. Code: ${resource.statusCode}`);
        }
        if (resource?.statusCode === 200) {
            song.format.work = true;
            return;
        }
        if (resource?.statusCode >= 400 && resource?.statusCode <= 500)
            return FindResource(song);
    }
    const resource = await httpsClient_1.httpsClient.Request(song.format?.url, GlobalOptions);
    if (resource instanceof Error) {
        delete song.format;
        throw Error(`Failed checking link resource. Code: ${resource.statusCode}`);
    }
    if (resource.statusCode >= 200 && resource.statusCode < 400)
        song.format.work = true;
    else {
        delete song.format;
        throw Error(`Failed checking link resource. Code: ${resource.statusCode}`);
    }
}
exports.FindResource = FindResource;
async function getLinkFormat({ type, url, title, author, duration }) {
    try {
        if (type === "SPOTIFY")
            return FindTrack(`${author.title} - ${title}`, duration.seconds);
        else if (type === "VK")
            return (await Platforms_1.VK.getTrack(url))?.format;
        else if (type === "SOUNDCLOUD")
            return (await Platforms_1.SoundCloud.getTrack(url))?.format;
        return getFormatYouTube(url);
    }
    catch {
        console.log('[FindResource]: [Fail to found format!]');
        return null;
    }
}
function FindTrack(nameSong, duration) {
    return Platforms_1.YouTube.SearchVideos(nameSong).then((Tracks) => {
        const FindTrack = Tracks.filter((track) => Filter(track, duration));
        if (FindTrack.length === 0)
            return null;
        return getFormatYouTube(FindTrack[0].url);
    });
}
function getFormatYouTube(url) {
    return Platforms_1.YouTube.getVideo(url, { onlyFormats: true });
}
function Filter(track, NeedDuration) {
    const DurationSong = (0, DurationUtils_1.ParserTime)(track.duration.seconds);
    return DurationSong >= NeedDuration && DurationSong < DurationSong + 7 && DurationSong > DurationSong - 7 && DurationSong < NeedDuration + 15;
}
