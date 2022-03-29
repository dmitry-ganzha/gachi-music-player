"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DelFile = exports.EnableMusicDirectory = exports.Directory = void 0;
const fs_1 = __importDefault(require("fs"));
function Directory(song) {
    const MusicID = song.id;
    const ChannelID = song.author.id;
    EnableMusicDirectory(`./db/_Audio/[${song.type}]/[${ChannelID}]/`);
    return {
        file: `./db/_Audio/[${song.type}]/[${ChannelID}]/[${MusicID}].ogg`
    };
}
exports.Directory = Directory;
function EnableMusicDirectory(dir) {
    const res = dir.split("/");
    let lol = '';
    for (let i in res) {
        lol += `${res[i]}/`;
        if (!fs_1.default.existsSync(`${lol}`)) {
            fs_1.default.mkdirSync(`${lol}`, (err) => console.log(err));
        }
    }
}
exports.EnableMusicDirectory = EnableMusicDirectory;
function DelFile(file) {
    fs_1.default.unlink(file, (err) => {
        if (err)
            return undefined;
    });
}
exports.DelFile = DelFile;
