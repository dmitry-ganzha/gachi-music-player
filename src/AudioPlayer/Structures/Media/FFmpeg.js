"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FFmpeg = void 0;
const stream_1 = require("stream");
const child_process_1 = require("child_process");
const FFmpeg_json_1 = __importDefault(require("../../../../DataBase/FFmpeg.json"));
let FFmpegName, FFprobeName;
function FFmpegCheck() {
    for (let source of FFmpeg_json_1.default.Names) {
        try {
            const result = (0, child_process_1.spawnSync)(source, ["-h"], { windowsHide: true, shell: false });
            if (result.error)
                continue;
            return FFmpegName = source;
        }
        catch { }
    }
    return Error("FFmpeg not found!");
}
function FFprobeCheck() {
    for (let source of ["ffprobe", "./FFmpeg/ffprobe"]) {
        try {
            const result = (0, child_process_1.spawnSync)(source, ["-h"], { windowsHide: true, shell: false });
            if (result.error)
                continue;
            return FFprobeName = source;
        }
        catch { }
    }
    return new Error("FFprobe not found!");
}
if (FFprobeName === undefined)
    Promise.all([FFprobeCheck()]).catch();
if (FFmpegName === undefined)
    Promise.all([FFmpegCheck()]).catch();
var FFmpeg;
(function (FFmpeg_1) {
    class FFmpeg extends stream_1.Duplex {
        _readableState;
        _writableState;
        #process;
        constructor(args, options = {}) {
            super({ highWaterMark: 12, autoDestroy: true, objectMode: true, ...options });
            if (!args.includes("-i"))
                args = ["-i", "-", ...args];
            this.#process = this.#SpawnFFmpeg(args);
            this._readableState = this.#input._readableState;
            this._writableState = this.#output._writableState;
            this.#Binding(["write", "end"], this.#output);
            this.#Binding(["read", "setEncoding", "pipe", "unpipe"], this.#input);
            this.#Calling(["on", "once", "removeListener", "removeListeners", "listeners"]);
        }
        ;
        get #input() { return this.#process.stdout; }
        ;
        get #output() { return this.#process.stdin; }
        ;
        #Binding = (methods, target) => methods.forEach((method) => this[method] = target[method].bind(target));
        #Calling = (methods) => {
            const EVENTS = {
                readable: this.#input,
                data: this.#input,
                end: this.#input,
                unpipe: this.#input,
                finish: this.#output,
                drain: this.#output,
            };
            methods.forEach((method) => this[method] = (ev, fn) => EVENTS[ev] ? EVENTS[ev][method](ev, fn) : stream_1.Duplex.prototype[method].call(this, ev, fn));
        };
        #SpawnFFmpeg = (Arguments) => (0, child_process_1.spawn)(FFmpegName, [...Arguments, "pipe:1"], { shell: false, windowsHide: true });
        _destroy = (error) => {
            if (!this.#process.killed) {
                this.removeAllListeners();
                this.#process.removeAllListeners();
                this.#process.kill("SIGKILL");
            }
            if (error)
                return console.error(error);
        };
    }
    FFmpeg_1.FFmpeg = FFmpeg;
    class FFprobe {
        #process;
        constructor(Arguments) {
            this.#process = this.#SpawnProbe(Arguments);
        }
        ;
        getInfo = () => new Promise((resolve) => {
            let information = "";
            this.#process.once("close", () => {
                this.#process?.kill();
                let JsonParsed = null;
                try {
                    JsonParsed = JSON.parse(information + "}");
                }
                catch { }
                return resolve(JsonParsed);
            });
            this.#process.stdout.once("data", (data) => information += data.toString());
            this.#process.once("error", () => this.#process?.kill());
        });
        #SpawnProbe = (Arguments) => (0, child_process_1.spawn)(FFprobeName, ["-print_format", "json", "-show_format", ...Arguments], { shell: false, windowsHide: true });
    }
    FFmpeg_1.FFprobe = FFprobe;
})(FFmpeg = exports.FFmpeg || (exports.FFmpeg = {}));
