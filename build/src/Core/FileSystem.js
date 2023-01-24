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
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoadFiles = exports.FileSystem = void 0;
const node_fs_1 = require("node:fs");
let FileBase = {
    Commands: [],
    Events: []
};
var FileSystem;
(function (FileSystem) {
    function createDirs(dir) {
        let dirs = dir.split("/");
        if (!dir.endsWith("/"))
            dirs.splice(dirs.length - 1);
        let currentDir = "";
        for (let i in dirs) {
            currentDir += `${dirs[i]}/`;
            if (!(0, node_fs_1.existsSync)(currentDir))
                (0, node_fs_1.mkdirSync)(currentDir);
        }
    }
    FileSystem.createDirs = createDirs;
})(FileSystem = exports.FileSystem || (exports.FileSystem = {}));
function log(type, dir, file, reason) {
    const Status = `Status: [${reason ? "🟥" : "🟩"}]`;
    const File = `File: [src/Handler/${type}/${dir}/${file}]`;
    let EndStr = `${Status} | ${File}`;
    if (reason)
        EndStr += ` | Reason: [${reason}]`;
    return FileBase[type].push(EndStr);
}
function LoadFiles(client) {
    const loadCallbacks = [
        (pull, { file, reason, dir }) => {
            if (reason)
                return log("Commands", dir, file, reason);
            else if (!pull.name)
                return log("Commands", dir, file, "Parameter name has undefined");
            client.commands.set(pull.name, pull);
            log("Commands", dir, file);
        },
        (pull, { file, reason, dir }) => {
            if (reason)
                return log("Events", dir, file, reason);
            else if (!pull.name)
                return log("Events", dir, file, "Parameter name has undefined");
            client.on(pull.name, (ev, ev2) => pull.run(ev, ev2, client));
            log("Events", dir, file);
        }
    ];
    ["Handler/Commands", "Handler/Events"].forEach((path, index) => {
        new FileLoader({ path, callback: loadCallbacks[index] });
        setImmediate(() => {
            if (client.ShardID === undefined)
                Object.entries(FileBase).forEach(([key, value]) => console.log(`| FileSystem... Loaded ${key} | ${value.length}\n${value.join("\n")}\n`));
            Object.entries(FileBase).forEach(([key,]) => delete FileBase[key]);
        });
    });
}
exports.LoadFiles = LoadFiles;
class FileLoader {
    path;
    callback;
    constructor(options) {
        this.path = options.path;
        this.callback = options.callback;
        this.readDir();
    }
    ;
    readDir = () => {
        (0, node_fs_1.readdirSync)(`./src/${this.path}`).forEach(async (dir) => {
            if (dir.endsWith(".js") || dir.endsWith(".ts"))
                return;
            const files = (0, node_fs_1.readdirSync)(`./src/${this.path}/${dir}/`).filter((file) => (file.endsWith(".js") || file.endsWith(".ts")));
            for (let file of files) {
                let reason = null;
                const pull = await this.findExport(`../${this.path}/${dir}/${file}`);
                if (!pull)
                    reason = "Not found exports";
                else if (!pull.isEnable)
                    reason = "Parameter isEnable has false";
                else if (!pull.run)
                    reason = "Function run has not found";
                if (pull instanceof Error)
                    reason = pull.message;
                if ("type" in pull)
                    pull.type = dir;
                this.callback(pull, { dir, file, reason });
            }
        });
    };
    findExport = async (path) => {
        var _a;
        const importFile = (await (_a = path, Promise.resolve().then(() => __importStar(require(_a)))));
        const keysFile = Object.keys(importFile);
        if (keysFile.length <= 0)
            return null;
        return new importFile[keysFile[0]];
    };
}
