"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Decoder = void 0;
const stream_1 = require("stream");
const FFmpeg_json_1 = __importDefault(require("../../../../DataBase/FFmpeg.json"));
const httpsClient_1 = require("../../../Core/httpsClient");
const FFmpeg_1 = require("./FFmpeg");
const Platforms_1 = require("../../../Structures/Platforms");
const Opus_1 = require("./Opus");
let FiltersStatic = {};
(() => {
    Object.entries(FFmpeg_json_1.default.FilterConfigurator).forEach(([key, object]) => {
        if ("speedModification" in object)
            FiltersStatic = { ...FiltersStatic, [key]: object.speedModification };
    });
})();
var Decoder;
(function (Decoder) {
    class All extends Opus_1.Opus.Ogg {
        #FFmpeg;
        #TimeFrame;
        #started = false;
        #playbackDuration = 0;
        get duration() { return this.#playbackDuration; }
        ;
        set duration(duration) { this.#playbackDuration = duration; }
        ;
        get hasStarted() { return this.#started; }
        ;
        constructor(parameters) {
            super({ autoDestroy: true });
            if (parameters.url instanceof Decoder.Dash) {
                this.#FFmpeg = new FFmpeg_1.FFmpeg.FFmpeg(ArgsHelper.createArgs(null, null, 0));
                parameters.url.pipe(this.#FFmpeg);
            }
            else {
                this.#FFmpeg = new FFmpeg_1.FFmpeg.FFmpeg(ArgsHelper.createArgs(parameters.url, parameters?.filters, parameters?.seek));
            }
            this.#FFmpeg.pipe(this);
            this.#TimeFrame = parameters?.filters.length > 0 ? ArgsHelper.timeFrame(parameters?.filters) : 20;
            this.once("readable", () => (this.#started = true));
            ["end", "close", "error"].forEach((event) => this.once(event, this.destroy));
        }
        ;
        read = () => {
            const packet = super.read();
            if (packet)
                this.duration += this.#TimeFrame;
            return packet;
        };
        _destroy = () => {
            if (!this.#FFmpeg?.destroyed)
                this.#FFmpeg?.destroy();
            if (!super.destroyed)
                super.destroy();
            setTimeout(() => {
                if (this && !this?.destroyed) {
                    super.destroy();
                    this?.removeAllListeners();
                    this?.destroy();
                }
            }, 125);
        };
    }
    Decoder.All = All;
    class Dash extends stream_1.PassThrough {
        #request;
        #NumberUrl = 0;
        #precache = 3;
        #urls;
        constructor(dash, video) {
            super({ highWaterMark: 5 * 1000 * 1000, autoDestroy: true });
            this.#urls = { dash, base: "", video };
            this.#DecodeDashManifest().catch((err) => console.log(err));
            this.once("end", this.destroy);
        }
        ;
        #DecodeDashManifest = async () => {
            const req = await httpsClient_1.httpsClient.parseBody(this.#urls.dash);
            const audioFormat = req.split('<AdaptationSet id="0"')[1].split('</AdaptationSet>')[0].split('</Representation>');
            if (audioFormat[audioFormat.length - 1] === '')
                audioFormat.pop();
            this.#urls.base = audioFormat[audioFormat.length - 1].split('<BaseURL>')[1].split('</BaseURL>')[0];
            await httpsClient_1.httpsClient.Request(`https://${new URL(this.#urls.base).host}/generate_204`);
            if (this.#NumberUrl === 0) {
                const list = audioFormat[audioFormat.length - 1].split('<SegmentList>')[1].split('</SegmentList>')[0]
                    .replaceAll('<SegmentURL media="', '').split('"/>');
                if (list[list.length - 1] === '')
                    list.pop();
                if (list.length > this.#precache)
                    list.splice(0, list.length - this.#precache);
                this.#NumberUrl = Number(list[0].split('sq/')[1].split('/')[0]);
                await this.#PipeData();
            }
        };
        #PipeData = () => {
            return new Promise(async (resolve) => {
                const request = await httpsClient_1.httpsClient.Request(`${this.#urls.base}sq/${this.#NumberUrl}`).catch((err) => err);
                if (this.destroyed)
                    return;
                if (request instanceof Error) {
                    this.#UpdateYouTubeDash().then(this.#DecodeDashManifest);
                    return;
                }
                this.#request = request;
                request.on('data', (c) => {
                    this.push(c);
                });
                request.on('end', () => {
                    this.#NumberUrl++;
                    return resolve(this.#PipeData());
                });
                request.once('error', (err) => {
                    this.emit('error', err);
                });
            });
        };
        #UpdateYouTubeDash = () => Platforms_1.YouTube.getVideo(this.#urls.video).then((video) => (this.#urls.dash = video.format.url));
        _destroy = () => {
            super.destroy();
            this.#request?.removeAllListeners();
            this.#request?.destroy();
        };
    }
    Decoder.Dash = Dash;
})(Decoder = exports.Decoder || (exports.Decoder = {}));
var ArgsHelper;
(function (ArgsHelper) {
    function createArgs(url, AudioFilters, seek) {
        let thisArgs = [...FFmpeg_json_1.default.Args.Reconnect, "-vn", ...FFmpeg_json_1.default.Args.Seek, seek ?? 0];
        if (url)
            thisArgs = [...thisArgs, "-i", url];
        return [...thisArgs, "-af", parseFilters(AudioFilters), ...FFmpeg_json_1.default.Args.OggOpus, ...FFmpeg_json_1.default.Args.DecoderPreset];
    }
    ArgsHelper.createArgs = createArgs;
    function timeFrame(AudioFilters) {
        let NumberDuration = 20;
        if (AudioFilters)
            AudioFilters.forEach((filter) => {
                if (typeof filter === "number")
                    return;
                const StaticFilter = FiltersStatic[filter];
                if (StaticFilter) {
                    if (typeof StaticFilter === "number") {
                        NumberDuration *= Number(StaticFilter);
                    }
                    else {
                        const Index = AudioFilters.indexOf(filter) + 1;
                        const number = AudioFilters.slice(Index);
                        NumberDuration *= Number(number);
                    }
                }
            });
        return NumberDuration;
    }
    ArgsHelper.timeFrame = timeFrame;
    function parseFilters(AudioFilters) {
        const response = [];
        if (AudioFilters)
            AudioFilters.forEach((name) => {
                if (typeof name === "number")
                    return;
                const Filter = FFmpeg_json_1.default.FilterConfigurator[name];
                if (Filter) {
                    if (Filter.value === false)
                        return response.push(Filter.arg);
                    const IndexFilter = AudioFilters.indexOf(name);
                    response.push(`${Filter.arg}${AudioFilters.slice(IndexFilter + 1)[0]}`);
                }
            });
        response.push(FFmpeg_json_1.default.Args.Filters.AudioFade);
        return response.join(",");
    }
})(ArgsHelper || (ArgsHelper = {}));
