"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAudioPlayer = exports.addAudioPlayer = exports.FFmpegStream = exports.FindResource = void 0;
const SPNK_1 = require("../../../../Core/SPNK");
const Song_1 = require("../Manager/Queue/Structures/Song");
const httpsClient_1 = require("../../../../Core/httpsClient");
const prism_media_1 = require("prism-media");
const FFmpeg_1 = require("./FFmpeg");
async function FindResource(song, req = 0) {
    if (req > 5)
        return;
    let format = await getLinkFormat(song);
    if (!format)
        return FindResource(song, req++);
    song.format = (0, Song_1.ConstFormat)(format);
    const resource = await new httpsClient_1.httpsClient().Request(song.format?.url, { request: { maxRedirections: 5, method: "GET" } }).catch(() => null);
    if (resource.statusCode === 200) {
        song.format.work = true;
        return;
    }
    if (resource.statusCode >= 400 && resource.statusCode <= 500)
        return FindResource(song, req++);
    return;
}
exports.FindResource = FindResource;
async function getLinkFormat({ type, url, title, author }) {
    try {
        if (type === "SPOTIFY")
            return FindTrack(`${author.title} - ${title}`);
        else if (type === "VK")
            return (await SPNK_1.VK.getTrack(url))?.format;
        return getFormatYouTube(url);
    }
    catch {
        console.log('[Streamer]: [Fail: getLinkFormat]: [ReSearch]');
        return null;
    }
}
async function FindTrack(nameSong) {
    const Song = await SPNK_1.YouTube.SearchVideos(nameSong, { onlyLink: true });
    if (Song)
        return getFormatYouTube(Song);
    return null;
}
async function getFormatYouTube(url) {
    return SPNK_1.YouTube.getVideo(url, { onlyFormats: true });
}
class FFmpegStream {
    constructor(url, AudioFilters) {
        this.silencePaddingFrames = 0;
        this.playbackDuration = 0;
        this.started = false;
        this.silenceRemaining = -1;
        this.read = () => {
            const packet = this.playStream?.read();
            if (packet)
                this.playbackDuration += 20;
            return packet;
        };
        this.destroy = async () => {
            if (this.FFmpeg) {
                this.FFmpeg.destroy();
                delete this.FFmpeg;
            }
            delete this.playbackDuration;
            delete this.started;
            delete this.silenceRemaining;
            setTimeout(() => {
                if (this.playStream) {
                    this.playStream.removeAllListeners();
                    this.playStream.destroy();
                    this.playStream.read();
                    delete this.playStream;
                }
                if (this.opusEncoder) {
                    this.opusEncoder.removeAllListeners();
                    this.opusEncoder.destroy();
                    this.opusEncoder.read();
                    delete this.opusEncoder;
                }
                delete this.silencePaddingFrames;
            }, 125);
            return;
        };
        this.opusEncoder = new prism_media_1.opus.OggDemuxer({
            autoDestroy: true,
            destroy: () => this.destroy().catch(() => undefined)
        });
        this.FFmpeg = new FFmpeg_1.FFmpeg(CreateArguments(AudioFilters, url));
        this.playStream = this.FFmpeg.pipe(this.opusEncoder);
        this.playStream.once('readable', () => (this.started = true));
        ['end', 'close', 'error'].map((event) => this.playStream.once(event, this.destroy));
        return;
    }
    get readable() {
        if (this.silenceRemaining === 0)
            return false;
        const read = this.playStream.readable;
        if (!read) {
            if (this.silenceRemaining === -1)
                this.silenceRemaining = this.silencePaddingFrames;
            return this.silenceRemaining !== 0;
        }
        return read;
    }
    ;
    get ended() {
        return this.playStream?.readableEnded || this.playStream?.destroyed || !this.playStream;
    }
    ;
    ;
}
exports.FFmpegStream = FFmpegStream;
function CreateArguments(AudioFilters, url) {
    return [
        ...FFmpeg_1.FFmpegArguments.Reconnect, ...FFmpeg_1.FFmpegArguments.Seek, AudioFilters?.seek ?? 0,
        '-i', url, "-vn", ...FFmpeg_1.FFmpegArguments.Other,
        ...CreateFilters(AudioFilters), ...FFmpeg_1.FFmpegArguments.OggOpus, ...FFmpeg_1.FFmpegArguments.Compress, ...FFmpeg_1.FFmpegArguments.DecoderPreset
    ];
}
function CreateFilters(AudioFilters) {
    if (!AudioFilters)
        return [];
    let resp = [], resSt = '', num = 0;
    if (AudioFilters._3D)
        resp = [...resp, FFmpeg_1.FFmpegArguments.Filters._3D];
    if (AudioFilters.speed)
        resp = [...resp, `${FFmpeg_1.FFmpegArguments.Filters.Speed}${AudioFilters.speed}`];
    if (AudioFilters.karaoke)
        resp = [...resp, FFmpeg_1.FFmpegArguments.Filters.Karaoke];
    if (AudioFilters.echo)
        resp = [...resp, FFmpeg_1.FFmpegArguments.Filters.Echo];
    if (AudioFilters.nightcore)
        resp = [...resp, FFmpeg_1.FFmpegArguments.Filters.NightCore];
    if (AudioFilters.Vw)
        resp = [...resp, FFmpeg_1.FFmpegArguments.Filters.vaporwave];
    if (AudioFilters.bass)
        resp = [...resp, `${FFmpeg_1.FFmpegArguments.Filters.bassboost}${AudioFilters.bass}`];
    if (AudioFilters.Sab_bass)
        resp = [...resp, FFmpeg_1.FFmpegArguments.Filters.Sub_boost];
    resp = [...resp, FFmpeg_1.FFmpegArguments.Filters.AudioFade];
    for (let i in resp) {
        if (num === resp.length)
            resSt += `${resp[i]}`;
        resSt += `${resp[i]},`;
        num++;
    }
    return resSt === '' ? [] : ['-af', resp];
}
let audioPlayers = [];
let AudioCycleInterval;
let nextTime = -1;
function audioCycleStep() {
    if (nextTime === -1)
        return;
    nextTime += 20;
    const available = audioPlayers.filter((player) => player.checkPlayable());
    prepareNextAudioFrame(available);
}
function prepareNextAudioFrame(players) {
    const nextPlayer = players.shift();
    if (!nextPlayer) {
        if (nextTime !== -1)
            AudioCycleInterval = setTimeout(audioCycleStep, nextTime - Date.now());
        return;
    }
    nextPlayer['_sendPacket']();
    setImmediate(() => prepareNextAudioFrame(players));
}
function hasAudioPlayer(target) {
    return audioPlayers.includes(target);
}
function addAudioPlayer(player) {
    if (hasAudioPlayer(player))
        return player;
    audioPlayers.push(player);
    if (audioPlayers.length === 1) {
        nextTime = Date.now();
        setImmediate(audioCycleStep);
    }
    return player;
}
exports.addAudioPlayer = addAudioPlayer;
function deleteAudioPlayer(player) {
    const index = audioPlayers.indexOf(player);
    if (index === -1)
        return;
    audioPlayers.splice(index, 1);
    if (audioPlayers.length === 0) {
        audioPlayers = [];
        nextTime = -1;
        if (typeof AudioCycleInterval !== 'undefined')
            clearTimeout(AudioCycleInterval);
    }
}
exports.deleteAudioPlayer = deleteAudioPlayer;
