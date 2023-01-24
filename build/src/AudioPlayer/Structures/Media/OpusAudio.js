"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpusAudio = void 0;
const tslib_1 = require("tslib");
const Config_json_1 = require("@db/Config.json");
const Client_1 = require("@Client/Client");
const _FFspace_1 = require("@FFspace");
const prism_media_1 = require("prism-media");
const stream_1 = require("stream");
const fs_1 = tslib_1.__importDefault(require("fs"));
class OpusAudio {
    _opus = new prism_media_1.opus.OggDemuxer({ autoDestroy: true, objectMode: true, highWaterMark: 8 });
    _streams = [];
    _ffmpeg;
    _duration = 0;
    _readable = false;
    _durFrame = 20;
    get duration() { return parseInt((this._duration / 1e3).toFixed(0)); }
    ;
    get readable() { return this._readable; }
    ;
    get destroyed() { return this._opus?.destroyed ?? true; }
    ;
    get ffmpeg() { return this._ffmpeg; }
    ;
    set ffmpeg(ffmpeg) { this._ffmpeg = ffmpeg; }
    ;
    get opus() { return this._opus; }
    ;
    constructor(path, options) {
        const resource = choiceResource(path);
        this.ffmpeg = new _FFspace_1.FFspace.FFmpeg(choiceArgs(path, typeof resource, options), { highWaterMark: 8 });
        if (resource instanceof stream_1.Readable) {
            resource.pipe(this.ffmpeg);
            this._streams.push(resource);
        }
        this.ffmpeg.pipe(this.opus);
        if (options?.filters?.length > 0)
            this._durFrame = getDurationFilters(options?.filters);
        if (options.seek > 0)
            this._duration = options.seek * 1e3;
        this.opus.once("readable", () => (this._readable = true));
        ["end", "close", "error"].forEach((event) => this.opus.once(event, this.destroy));
        if (Config_json_1.Debug)
            (0, Client_1.consoleTime)(`[Debug] -> OpusAudio: [Start decoding file in ${path}]`);
    }
    ;
    read = () => {
        const packet = this.opus?.read();
        if (packet)
            this._duration += this._durFrame;
        return packet;
    };
    destroy = () => {
        delete this._duration;
        delete this._readable;
        delete this._durFrame;
        if (this._streams?.length > 0) {
            for (const stream of this._streams) {
                if (stream !== undefined && !stream.destroyed) {
                    stream.removeAllListeners();
                    stream.destroy();
                    stream.read();
                }
            }
        }
        delete this._streams;
        if (this.ffmpeg.deletable) {
            this.ffmpeg.removeAllListeners();
            this.ffmpeg.destroy();
            this.ffmpeg.read();
        }
        delete this._ffmpeg;
        if (this.opus) {
            this.opus.removeAllListeners();
            this.opus.destroy();
            this.opus.read();
        }
        delete this._opus;
        if (Config_json_1.Debug)
            (0, Client_1.consoleTime)(`[Debug] -> OpusAudio: [Clear memory]`);
    };
}
exports.OpusAudio = OpusAudio;
function choiceResource(path) {
    return path.endsWith("opus") ? fs_1.default.createReadStream(path) : path;
}
function choiceArgs(url, resource, options) {
    if (resource === "string")
        return createArgs(url, options?.filters, options?.seek);
    return createArgs(null, options?.filters, options?.seek);
}
function createArgs(url, AudioFilters, seek) {
    const thisArgs = ["-reconnect", 1, "-reconnect_streamed", 1, "-reconnect_delay_max", 5];
    const audioDecoding = ["-c:a", "libopus", "-f", "opus"];
    const audioBitrate = ["-b:a", Config_json_1.Music.Audio.bitrate];
    const filters = getFilters(AudioFilters);
    if (seek)
        thisArgs.push("-ss", seek ?? 0);
    if (url)
        thisArgs.push("-i", url);
    if (filters.length > 0)
        thisArgs.push("-af", filters);
    return [...thisArgs, "-compression_level", 12,
        ...audioDecoding, ...audioBitrate, "-preset:a", "ultrafast"
    ];
}
function getDurationFilters(AudioFilters) {
    let duration = 20;
    if (AudioFilters)
        parseFilters(AudioFilters, (fl, filter) => {
            if (filter?.speed) {
                if (typeof filter.speed === "number")
                    duration *= Number(filter.speed);
                else {
                    const Index = AudioFilters.indexOf(fl) + 1;
                    const number = AudioFilters.slice(Index);
                    duration *= Number(number);
                }
            }
        });
    return duration;
}
function getFilters(AudioFilters) {
    const response = [];
    if (Config_json_1.Music.Audio.transition)
        response.push("afade=t=in:st=0:d=3");
    if (AudioFilters)
        parseFilters(AudioFilters, (fl, filter) => {
            if (filter) {
                if (!filter.args)
                    return response.push(filter.filter);
                const indexFilter = AudioFilters.indexOf(fl);
                response.push(`${filter.filter}${AudioFilters.slice(indexFilter + 1)[0]}`);
            }
        });
    return response.join(",");
}
function parseFilters(AudioFilters, callback) {
    AudioFilters.forEach((filter) => {
        if (typeof filter === "number")
            return;
        const Filter = _FFspace_1.FFspace.getFilter(filter);
        return callback(filter, Filter);
    });
}
