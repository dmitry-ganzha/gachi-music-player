"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _MultiLoader_ForLoad, _MultiLoader_getFile;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileSystemLoad = void 0;
const fs_1 = require("fs");
class MultiLoader {
    constructor(options) {
        this.readdirSync = async () => (0, fs_1.readdirSync)(`./src/${this.path}`).forEach((dir) => {
            if (dir.endsWith(".js") || dir.endsWith(".ts"))
                return null;
            const Files = (0, fs_1.readdirSync)(`./src/${this.path}/${dir}/`).filter((d) => (d.endsWith('.js') || d.endsWith('.ts')));
            return __classPrivateFieldGet(this, _MultiLoader_ForLoad, "f").call(this, Files, dir);
        });
        _MultiLoader_ForLoad.set(this, async (Files, dir) => {
            for (let file of Files) {
                let pull;
                try {
                    pull = await __classPrivateFieldGet(this, _MultiLoader_getFile, "f").call(this, `../${this.path}/${dir}/${file}`);
                    pull.type = dir;
                    if (!pull.enable)
                        continue;
                }
                catch (e) {
                    console.log(e);
                    continue;
                }
                this.callback(pull, { dir: dir, file: file });
            }
        });
        _MultiLoader_getFile.set(this, async (path) => {
            let cmd = (await Promise.resolve().then(() => __importStar(require(path))));
            let name = Object.keys(cmd)[0];
            return new cmd[name];
        });
        this.name = options.name;
        this.path = options.path;
        this.callback = options.callback;
    }
    ;
}
_MultiLoader_ForLoad = new WeakMap(), _MultiLoader_getFile = new WeakMap();
async function FileSystemLoad(client) {
    const ClientShard = client.ShardID !== undefined;
    if (!ClientShard)
        console.clear();
    await Promise.all([
        new MultiLoader({
            name: 'Commands',
            path: 'Commands',
            callback: (pull, op) => {
                const { dir, file } = op;
                if (pull.name) {
                    client.commands.set(pull.name, pull);
                    if (!ClientShard)
                        SendLog(file, `./Commands/${dir}/${file}`, "✔️");
                }
                else {
                    if (!ClientShard)
                        SendLog(file, `./Commands/${dir}/${file}`, "✖️");
                }
                if (pull.aliases && Array.isArray(pull.aliases))
                    pull.aliases.forEach((alias) => client.aliases.set(alias, pull.name));
            }
        }).readdirSync(),
        new MultiLoader({
            name: 'Events',
            path: 'Events',
            callback: (pull, op) => {
                const { dir, file } = op;
                if (pull) {
                    client.on(pull.name, async (ev, ev2) => pull.run(ev, ev2, client));
                    if (!ClientShard)
                        SendLog(file, `./Events/${dir}/${file}`, "✔️");
                }
                else {
                    if (!ClientShard)
                        SendLog(file, `./Events/${dir}/${file}`, "✖️");
                }
            }
        }).readdirSync(),
        new MultiLoader({
            name: 'Modules',
            path: 'Modules',
            callback: (pull, op) => {
                const { dir, file } = op;
                if (pull) {
                    pull.run(client);
                    if (!ClientShard)
                        SendLog(file, `./Modules/${dir}/${file}`, "✔️");
                }
                else {
                    if (!ClientShard)
                        SendLog(file, `./Modules/${dir}/${file}`, "✖️");
                }
            }
        }).readdirSync(),
        setImmediate(() => {
            if (!ClientShard)
                console.log(`----------------------------> [FileSystem Ending loading] <----------------------------`);
        })
    ]);
}
exports.FileSystemLoad = FileSystemLoad;
function FileType(file) {
    return file.endsWith('.ts') ? `TS` : `JS`;
}
function AddTime() {
    return `[FileSystem]`;
}
function SendLog(File, Path, status) {
    return console.log(`${AddTime()} ->  Status: [${status}] | Type: [${FileType(File)}] | Path: [${Path}]`);
}
