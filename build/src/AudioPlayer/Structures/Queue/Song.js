"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Song = void 0;
const SongSupport_1 = require("../SongSupport");
const DownloadManager_1 = require("@Managers/DownloadManager");
const DurationUtils_1 = require("@Managers/DurationUtils");
const _httpsClient_1 = require("@httpsClient");
const Config_json_1 = require("@db/Config.json");
class Song {
    #title;
    #url;
    #author;
    #duration;
    #image;
    #requester;
    #isLive;
    #color;
    #platform;
    #resLink;
    constructor(track, author) {
        const platform = SongSupport_1.platformSupporter.getPlatform(track.url);
        const { username, id, avatar } = author;
        const seconds = parseInt(track.duration.seconds);
        this.#title = track.title;
        this.#url = track.url;
        this.#author = {
            url: track.author?.url ?? `https://discordapp.com/users/${id}`,
            title: track.author?.title ?? username,
            image: track.author?.image ?? { url: Config_json_1.Music.images._image },
            isVerified: track.author?.isVerified ?? undefined
        };
        this.#duration = { seconds, full: seconds > 0 ? DurationUtils_1.DurationUtils.ParsingTimeToString(seconds) : "Live" };
        this.#image = track.image;
        this.#requester = { username, id, avatarURL: () => `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp` };
        this.#isLive = track.isLive;
        this.#color = SongSupport_1.platformSupporter.getColor(platform);
        this.#platform = platform;
        this.#resLink = track?.format?.url;
    }
    ;
    get title() { return this.#title; }
    ;
    get url() { return this.#url; }
    ;
    get author() { return this.#author; }
    ;
    get duration() { return this.#duration; }
    ;
    get image() { return this.#image; }
    ;
    get requester() { return this.#requester; }
    ;
    get isLive() { return this.#isLive; }
    ;
    get color() { return this.#color; }
    ;
    get platform() { return this.#platform; }
    ;
    get link() { return this.#resLink; }
    ;
    set link(url) { this.#resLink = url; }
    ;
    resource = (seek, req = 0) => new Promise(async (resolve) => {
        if (req > 3)
            return resolve(null);
        const CacheMusic = Config_json_1.Music.CacheMusic;
        if (CacheMusic) {
            const info = DownloadManager_1.DownloadManager.getNames(this);
            if (info.status === "final")
                return resolve(info.path);
        }
        if (!this.link)
            this.link = await SongSupport_1.SongFinder.getLinkResource(this);
        const checkResource = await _httpsClient_1.httpsClient.checkLink(this.link);
        if (checkResource === "OK") {
            if (CacheMusic)
                setImmediate(() => DownloadManager_1.DownloadManager.download(this, this.link));
            return resolve(this.link);
        }
        req++;
        this.link = null;
        return resolve(this.resource(seek, req));
    });
}
exports.Song = Song;
