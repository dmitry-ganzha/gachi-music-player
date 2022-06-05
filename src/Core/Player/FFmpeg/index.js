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
var _FFmpeg_instances, _FFmpeg_process, _FFmpeg_Input_get, _FFmpeg_Output_get, _FFmpeg_Binding, _FFmpeg_Calling, _FFmpeg_SpawnFFmpeg, _FFprobe_process, _FFprobe_SpawnProbe;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnableFilters = exports.CreateFilters = exports.FFprobe = exports.FFmpeg = void 0;
const child_process_1 = require("child_process");
const stream_1 = require("stream");
const FFmpeg_json_1 = __importDefault(require("../../../../DataBase/FFmpeg.json"));
let FFmpegName;
let FFprobeName;
const FFmpegCheck = () => {
    try {
        for (let source of FFmpeg_json_1.default.Names) {
            try {
                const result = (0, child_process_1.spawnSync)(source, ['-h'], { windowsHide: true, shell: false });
                if (result.error)
                    continue;
                FFmpegName = source;
            }
            catch { }
        }
    }
    catch {
        throw new Error('FFmpeg not found!');
    }
    for (let source of ["ffprobe"]) {
        try {
            const result = (0, child_process_1.spawnSync)(source, ['-h'], { windowsHide: true, shell: false });
            if (result.error)
                continue;
            return FFprobeName = source;
        }
        catch { }
    }
    throw new Error('FFprobe not found!');
};
if (FFmpegName === undefined || FFprobeName === undefined)
    Promise.all([FFmpegCheck()]).catch();
class FFmpeg extends stream_1.Duplex {
    constructor(args) {
        super({ highWaterMark: 12, autoDestroy: true });
        _FFmpeg_instances.add(this);
        _FFmpeg_process.set(this, void 0);
        _FFmpeg_Binding.set(this, (methods, target) => methods.forEach((method) => this[method] = target[method].bind(target)));
        _FFmpeg_Calling.set(this, (methods) => {
            const EVENTS = {
                readable: __classPrivateFieldGet(this, _FFmpeg_instances, "a", _FFmpeg_Input_get),
                data: __classPrivateFieldGet(this, _FFmpeg_instances, "a", _FFmpeg_Input_get),
                end: __classPrivateFieldGet(this, _FFmpeg_instances, "a", _FFmpeg_Input_get),
                unpipe: __classPrivateFieldGet(this, _FFmpeg_instances, "a", _FFmpeg_Input_get),
                finish: __classPrivateFieldGet(this, _FFmpeg_instances, "a", _FFmpeg_Output_get),
                drain: __classPrivateFieldGet(this, _FFmpeg_instances, "a", _FFmpeg_Output_get),
            };
            methods.forEach((method) => this[method] = (ev, fn) => EVENTS[ev] ? EVENTS[ev][method](ev, fn) : stream_1.Duplex.prototype[method].call(this, ev, fn));
        });
        _FFmpeg_SpawnFFmpeg.set(this, (Arguments) => {
            const Args = [...Arguments, 'pipe:1'];
            if (!Args.includes('-i'))
                Args.unshift('-i', '-');
            return (0, child_process_1.spawn)(FFmpegName, Args, { shell: false, windowsHide: true });
        });
        this._destroy = (error) => {
            if (__classPrivateFieldGet(this, _FFmpeg_process, "f")) {
                this.removeAllListeners();
                __classPrivateFieldGet(this, _FFmpeg_process, "f").removeAllListeners();
                __classPrivateFieldGet(this, _FFmpeg_process, "f").kill("SIGKILL");
            }
            if (error)
                return console.error(error);
        };
        __classPrivateFieldSet(this, _FFmpeg_process, __classPrivateFieldGet(this, _FFmpeg_SpawnFFmpeg, "f").call(this, args), "f");
        __classPrivateFieldGet(this, _FFmpeg_Binding, "f").call(this, ['write', 'end'], __classPrivateFieldGet(this, _FFmpeg_instances, "a", _FFmpeg_Output_get));
        __classPrivateFieldGet(this, _FFmpeg_Binding, "f").call(this, ['read', 'setEncoding', 'pipe', 'unpipe'], __classPrivateFieldGet(this, _FFmpeg_instances, "a", _FFmpeg_Input_get));
        if (!args.includes('-i'))
            __classPrivateFieldGet(this, _FFmpeg_Calling, "f").call(this, ['on', 'once', 'removeListener', 'removeListeners', 'listeners']);
    }
    ;
    ;
    ;
}
exports.FFmpeg = FFmpeg;
_FFmpeg_process = new WeakMap(), _FFmpeg_Binding = new WeakMap(), _FFmpeg_Calling = new WeakMap(), _FFmpeg_SpawnFFmpeg = new WeakMap(), _FFmpeg_instances = new WeakSet(), _FFmpeg_Input_get = function _FFmpeg_Input_get() { return __classPrivateFieldGet(this, _FFmpeg_process, "f").stdout; }, _FFmpeg_Output_get = function _FFmpeg_Output_get() { return __classPrivateFieldGet(this, _FFmpeg_process, "f").stdin; };
class FFprobe {
    constructor(Arguments) {
        _FFprobe_process.set(this, void 0);
        this.getInfo = () => new Promise((resolve) => {
            let information = '';
            __classPrivateFieldGet(this, _FFprobe_process, "f").once('close', () => {
                __classPrivateFieldGet(this, _FFprobe_process, "f")?.kill();
                let JsonParsed = null;
                try {
                    JsonParsed = JSON.parse(information + '}');
                }
                catch { }
                return resolve(JsonParsed);
            });
            __classPrivateFieldGet(this, _FFprobe_process, "f").stdout.once('data', (data) => information += data.toString());
            __classPrivateFieldGet(this, _FFprobe_process, "f").once("error", () => __classPrivateFieldGet(this, _FFprobe_process, "f")?.kill());
        });
        _FFprobe_SpawnProbe.set(this, (Arguments) => (0, child_process_1.spawn)(FFprobeName, ['-print_format', 'json', '-show_format', ...Arguments], { shell: false, windowsHide: true }));
        __classPrivateFieldSet(this, _FFprobe_process, __classPrivateFieldGet(this, _FFprobe_SpawnProbe, "f").call(this, Arguments), "f");
    }
    ;
}
exports.FFprobe = FFprobe;
_FFprobe_process = new WeakMap(), _FFprobe_SpawnProbe = new WeakMap();
function CreateFilters(AudioFilters) {
    const response = [];
    if (AudioFilters)
        AudioFilters.forEach((name) => {
            if (typeof name === 'number')
                return;
            const Filter = FFmpeg_json_1.default.FilterConfigurator[name];
            if (!Filter)
                return;
            if (Filter.value === false)
                return response.push(Filter.arg);
            const index = AudioFilters.indexOf(name);
            if (index === -1)
                return;
            response.push(`${Filter.arg}${AudioFilters.slice(index + 1)[0]}`);
            return;
        });
    response.push(FFmpeg_json_1.default.Args.Filters.AudioFade);
    return response.join(',');
}
exports.CreateFilters = CreateFilters;
function getEnableFilters(AudioFilters) {
    if (!AudioFilters)
        return null;
    const response = [];
    AudioFilters.forEach((name) => {
        if (typeof name === 'number')
            return;
        response.push(name);
    });
    return response.join(', ');
}
exports.getEnableFilters = getEnableFilters;
