"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FFspace = void 0;
const tslib_1 = require("tslib");
const child_process_1 = require("child_process");
const stream_1 = require("stream");
const Filters_json_1 = tslib_1.__importDefault(require("@db/Filters.json"));
const Client_1 = require("@Client/Client");
const package_json_1 = require("package.json");
const Config_json_1 = require("@db/Config.json");
const paths = {
    ffmpeg: ["ffmpeg", "avconv"],
    ffprobe: ["ffprobe"]
};
let FFmpegName, FFprobeName;
function CheckFile(paths, error) {
    for (let path of paths) {
        const result = (0, child_process_1.spawnSync)(path, ["-h"], { windowsHide: true, shell: false });
        if (result.error)
            continue;
        return path;
    }
    throw Error(error);
}
if (!FFmpegName) {
    try {
        if (Object.keys(package_json_1.dependencies).includes("ffmpeg-static"))
            paths.ffmpeg.push(require("ffmpeg-static"));
    }
    catch (e) { }
    FFmpegName = CheckFile(paths.ffmpeg, "FFmpeg not found!");
    delete paths.ffmpeg;
}
if (!FFprobeName) {
    try {
        if (Object.keys(package_json_1.dependencies).includes("ffprobe-static"))
            paths.ffprobe.push(require("ffprobe-static").path);
    }
    catch (e) { }
    FFprobeName = CheckFile(paths.ffprobe, "FFprobe not found!");
    delete paths.ffprobe;
}
var FFspace;
(function (FFspace) {
    class FFmpeg extends stream_1.Duplex {
        process;
        constructor(args, options = {}) {
            super({ autoDestroy: true, objectMode: true, ...options });
            if (!args.includes("-i"))
                args = ["-i", "-", ...args];
            this.process = runProcess(FFmpegName, [...args, "pipe:1"]);
            if (Config_json_1.Debug)
                (0, Client_1.consoleTime)(`[Debug] -> FFmpeg: [Execute]`);
            this.setter(["write", "end"], this.stdin);
            this.setter(["read", "setEncoding", "pipe", "unpipe"], this.stdout);
            this.setter(["on", "once", "removeListener", "removeListeners", "listeners"]);
        }
        get deletable() { return !this.process?.killed || !this.destroyed || !!this.process; }
        ;
        get stdout() { return this?.process?.stdout; }
        ;
        get stdin() { return this?.process?.stdin; }
        ;
        setter = (methods, target) => {
            if (target)
                return methods.forEach((method) => this[method] = target[method].bind(target));
            else {
                const EVENTS = { readable: this.stdout, data: this.stdout, end: this.stdout, unpipe: this.stdout, finish: this.stdin, close: this.stdin, drain: this.stdin };
                methods.forEach((method) => this[method] = (ev, fn) => EVENTS[ev] ? EVENTS[ev][method](ev, fn) : stream_1.Duplex.prototype[method].call(this, ev, fn));
            }
        };
        _destroy = (error) => {
            this.removeAllListeners();
            if (!super.destroyed)
                super.destroy();
            [this.process.stdin, this.process.stdout, this.process.stderr].forEach((stream) => {
                if (stream !== undefined && !stream.destroyed) {
                    stream.removeAllListeners();
                    stream.destroy();
                }
            });
            if (this.deletable) {
                this.process.removeAllListeners();
                this.process.kill("SIGKILL");
            }
            delete this.process;
            if (Config_json_1.Debug)
                (0, Client_1.consoleTime)(`[Debug] -> FFmpeg: [Clear memory]`);
            if (error)
                return console.error(error);
        };
    }
    FFspace.FFmpeg = FFmpeg;
    function FFprobe(url) {
        const ffprobe = runProcess(FFprobeName, ["-print_format", "json", "-show_format", "-i", url]);
        let information = "";
        const cleanup = () => {
            if (!ffprobe.killed)
                ffprobe.kill("SIGKILL");
        };
        return new Promise((resolve) => {
            ffprobe.once("close", () => { cleanup(); return resolve(JSON.parse(information + "}")); });
            ffprobe.stdout.once("data", (data) => information += data.toString());
            ffprobe.once("error", cleanup);
        });
    }
    FFspace.FFprobe = FFprobe;
    function getFilter(name) { return Filters_json_1.default.find((fn) => fn.names.includes(name)); }
    FFspace.getFilter = getFilter;
})(FFspace = exports.FFspace || (exports.FFspace = {}));
function runProcess(file, args) {
    return (0, child_process_1.spawn)(file, args, { shell: false });
}
