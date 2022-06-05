"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _ConstructorStream_FFmpeg, _ConstructorStream_started, _ConstructorStream_TimeFrame;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructorStream = void 0;
const _1 = require(".");
const FFmpeg_json_1 = __importDefault(require("../../../../DataBase/FFmpeg.json"));
const prism_media_1 = require("prism-media");
const OptionsPrism = { autoDestroy: true, highWaterMark: 12 };
class ConstructorStream {
    constructor(parameters) {
        this.playbackDuration = 0;
        _ConstructorStream_FFmpeg.set(this, void 0);
        _ConstructorStream_started.set(this, false);
        _ConstructorStream_TimeFrame.set(this, 20);
        this.read = () => {
            const packet = this.playStream?.read();
            if (packet)
                this.playbackDuration += __classPrivateFieldGet(this, _ConstructorStream_TimeFrame, "f");
            return packet;
        };
        this.destroy = () => {
            if (__classPrivateFieldGet(this, _ConstructorStream_FFmpeg, "f"))
                __classPrivateFieldGet(this, _ConstructorStream_FFmpeg, "f").destroy();
            delete this.playbackDuration;
            setTimeout(() => {
                if (this.playStream && !this.playStream?.destroyed) {
                    this.playStream?.removeAllListeners();
                    this.playStream?.destroy();
                }
                delete this.playStream;
            }, 125);
        };
        setImmediate(() => __classPrivateFieldSet(this, _ConstructorStream_TimeFrame, __classPrivateFieldGet(this, _ConstructorStream_TimeFrame, "f") * FFmpegTimer(parameters?.Filters) || 20, "f"));
        if (typeof parameters.stream === "string") {
            __classPrivateFieldSet(this, _ConstructorStream_FFmpeg, new _1.FFmpeg(CreateArguments(parameters.stream, parameters?.Filters, parameters?.seek)), "f");
            this.playStream = new prism_media_1.opus.OggDemuxer(OptionsPrism);
            __classPrivateFieldGet(this, _ConstructorStream_FFmpeg, "f").pipe(this.playStream);
        }
        else {
            if (parameters.Filters || parameters.seek || parameters.type === 'ffmpeg') {
                __classPrivateFieldSet(this, _ConstructorStream_FFmpeg, new _1.FFmpeg(CreateArguments(null, parameters?.Filters, parameters?.seek)), "f");
                this.playStream = new prism_media_1.opus.OggDemuxer(OptionsPrism);
                parameters.stream.pipe(__classPrivateFieldGet(this, _ConstructorStream_FFmpeg, "f"));
                __classPrivateFieldGet(this, _ConstructorStream_FFmpeg, "f").pipe(this.playStream);
            }
            else if (parameters.type === 'ogg/opus') {
                this.playStream = new prism_media_1.opus.OggDemuxer(OptionsPrism);
                parameters.stream.pipe(this.playStream);
            }
            else if (parameters.type === 'webm/opus') {
                this.playStream = new prism_media_1.opus.WebmDemuxer(OptionsPrism);
                parameters.stream.pipe(this.playStream);
            }
        }
        this.playStream.once("readable", () => (__classPrivateFieldSet(this, _ConstructorStream_started, true, "f")));
        ["end", "close", "error"].forEach((event) => this.playStream.once(event, this.destroy));
        return;
    }
    get hasStarted() {
        return __classPrivateFieldGet(this, _ConstructorStream_started, "f");
    }
    ;
    get readable() {
        return this.playStream.readable;
    }
    ;
    get ended() {
        return this.playStream?.readableEnded || this.playStream?.destroyed || !this.playStream;
    }
    ;
    ;
}
exports.ConstructorStream = ConstructorStream;
_ConstructorStream_FFmpeg = new WeakMap(), _ConstructorStream_started = new WeakMap(), _ConstructorStream_TimeFrame = new WeakMap();
function CreateArguments(url, AudioFilters, seek) {
    let Arg = [...FFmpeg_json_1.default.Args.Reconnect, "-vn", ...FFmpeg_json_1.default.Args.Seek, seek ?? 0];
    if (url)
        Arg = [...Arg, '-i', url];
    if (AudioFilters)
        return [...Arg, "-af", (0, _1.CreateFilters)(AudioFilters), ...FFmpeg_json_1.default.Args.OggOpus, ...FFmpeg_json_1.default.Args.DecoderPreset];
    return [...Arg, ...FFmpeg_json_1.default.Args.OggOpus, ...FFmpeg_json_1.default.Args.DecoderPreset];
}
function FFmpegTimer(AudioFilters) {
    if (!AudioFilters)
        return null;
    let NumberDuration = 0;
    if (AudioFilters.indexOf("nightcore") >= 0) {
        const Arg = FFmpeg_json_1.default.FilterConfigurator["nightcore"].arg;
        const number = Arg.split("*")[1].split(",")[0];
        NumberDuration += Number(number);
    }
    if (AudioFilters.indexOf("speed") >= 0) {
        const Index = AudioFilters.indexOf('speed') + 1;
        const number = AudioFilters.slice(Index);
        NumberDuration += Number(number);
    }
    if (AudioFilters.indexOf("vaporwave")) {
        const Arg = FFmpeg_json_1.default.FilterConfigurator["vaporwave"].arg;
        const number1 = Arg.split("*")[1].split(",")[0];
        const number2 = Arg.split(",atempo=")[1];
        NumberDuration += Number(number1 + number2);
    }
    return NumberDuration;
}
