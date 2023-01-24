"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DownloadManager = void 0;
const fs_1 = require("fs");
const Command_1 = require("@Structures/Handle/Command");
const _httpsClient_1 = require("@httpsClient");
const _FileSystem_1 = require("@FileSystem");
const Config_json_1 = require("@db/Config.json");
const QueueSongs = [];
if (Config_json_1.Music.CacheDir.endsWith("/"))
    Config_json_1.Music.CacheDir.slice(Config_json_1.Music.CacheDir.length - 1);
var DownloadManager;
(function (DownloadManager) {
    function download(track, resource) {
        const findSong = QueueSongs.find((song) => song.title === track.title);
        const names = getNames(track);
        if (findSong || track.duration.seconds > 800 || names.status !== "not")
            return;
        _FileSystem_1.FileSystem.createDirs(names.path);
        QueueSongs.push({ title: track.title, author: track.author.title, duration: track.duration.seconds, resource });
        if (QueueSongs.length === 1)
            cycleStep();
    }
    DownloadManager.download = download;
    function getNames(track) {
        const author = Command_1.replacer.replaceArray(track?.author?.title ?? track?.author, ["|", ",", "<", ">", ":", "\\", "/", "*", "?"]);
        const song = Command_1.replacer.replaceArray(track.title, ["|", ",", "<", ">", ":", "\\", "/", "*", "?"]);
        const fullPath = `${Config_json_1.Music.CacheDir}/[${author}]/[${song}]`;
        if ((0, fs_1.existsSync)(`${fullPath}.opus`))
            return { status: "final", path: `${fullPath}.opus` };
        else if ((0, fs_1.existsSync)(`${fullPath}.raw`))
            return { status: "download", path: `${fullPath}.raw` };
        return { status: "not", path: `${fullPath}.raw` };
    }
    DownloadManager.getNames = getNames;
})(DownloadManager = exports.DownloadManager || (exports.DownloadManager = {}));
function cycleStep() {
    const song = QueueSongs[0];
    if (!song)
        return;
    QueueSongs.shift();
    const names = DownloadManager.getNames(song);
    if (names.status === "final")
        return void setTimeout(() => cycleStep(), 2e3);
    setImmediate(() => {
        _httpsClient_1.httpsClient.Request(song.resource).then((req) => {
            if (req.pipe) {
                const file = (0, fs_1.createWriteStream)(`./${names.path}`);
                file.once("ready", () => req.pipe(file));
                file.once("error", console.warn);
                ["close", "finish"].forEach(event => file.once(event, () => {
                    const refreshName = DownloadManager.getNames(song).path.split(".raw")[0];
                    (0, fs_1.rename)(names.path, `${refreshName}.opus`, () => null);
                    void setTimeout(() => cycleStep(), 2e3);
                }));
            }
        });
    });
}
