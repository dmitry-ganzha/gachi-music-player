"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FFmpeg = exports.FFmpegArguments = void 0;
const child_process_1 = require("child_process");
const stream_1 = require("stream");
let FFmpegName;
let sources = ['ffmpeg', 'avconv', './FFmpeg/ffmpeg', './FFmpeg/avconv', './node_modules/ffmpeg-static/ffmpeg'];
exports.FFmpegArguments = {
    OggOpus: ["-acodec", "libopus", "-f", "opus"],
    Seek: ["-ss"],
    Reconnect: ["-reconnect", 1, "-reconnect_delay_max", 125, "-reconnect_streamed", 1],
    Compress: ["-compression_level", 10],
    DecoderPreset: ["-preset", "ultrafast", "-tune", "fastdecode", "-ar", 48e3, "-ac", 2],
    Other: ["-analyzeduration", 0, "-loglevel", 1],
    Filters: {
        NightCore: "asetrate=48000*1.25,aresample=48000,bass=g=5",
        Karaoke: "stereotools=mlev=0.1",
        Echo: "aecho=0.8:0.9:1000:0.3",
        _3D: "apulsator=hz=0.125",
        Speed: "atempo=",
        bassboost: "bass=g=",
        Sub_boost: "asubboost",
        vibro: "vibrato=f=6.5",
        phaser: "aphaser=in_gain=0.4",
        vaporwave: "asetrate=48000*0.8,aresample=48000,atempo=1.1",
        AudioFade: "afade=t=in:st=0:d=1.5"
    }
};
const FFmpegCheck = async () => {
    for (let source of sources) {
        if (FFmpegName)
            break;
        try {
            const result = (0, child_process_1.spawnSync)(source, ['-h'], { windowsHide: true });
            if (result.error)
                continue;
            return FFmpegName = source;
        }
        catch { }
    }
    throw new Error('FFmpeg/avconv not found!');
};
if (!FFmpegName)
    Promise.all([FFmpegCheck()]).catch();
class FFmpeg extends stream_1.Duplex {
    constructor(args) {
        super({ highWaterMark: 12, autoDestroy: true });
        this.Binding = (methods, target) => {
            for (const method of methods) {
                this[method] = target[method].bind(target);
            }
        };
        this._destroy = (error) => {
            if (this.ProcessInput) {
                this.ProcessInput.removeAllListeners();
                this.ProcessInput.destroy();
                this.ProcessInput.read();
                delete this.process.stdout;
            }
            if (this.ProcessOutput) {
                this.ProcessOutput.removeAllListeners();
                this.ProcessOutput.destroy();
                delete this.process.stdin;
            }
            if (this.process) {
                this.removeAllListeners();
                this.process.removeAllListeners();
                this.process.kill("SIGKILL");
                delete this.process;
            }
            if (error)
                return console.error(error);
        };
        this.process = SpawnFFmpeg(args);
        this.Binding(['write', 'end'], this.ProcessOutput);
        this.Binding(['read', 'setEncoding', 'pipe', 'unpipe'], this.ProcessInput);
        const processError = (error) => this.emit('error', error);
        this.ProcessInput.once('error', processError);
        this.ProcessOutput.once('error', processError);
    }
    get ProcessInput() { return this.process.stdout; }
    ;
    get ProcessOutput() { return this.process.stdin; }
    ;
    ;
}
exports.FFmpeg = FFmpeg;
function SpawnFFmpeg(Arguments) {
    const Args = [...Arguments, 'pipe:1'];
    return (0, child_process_1.spawn)(FFmpegName, Args, { shell: false, windowsHide: true });
}
