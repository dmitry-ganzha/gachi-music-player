"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Song = exports.SupportPlatforms = void 0;
const LiteUtils_1 = require("../../../Core/Utils/LiteUtils");
const DurationUtils_1 = require("../../Manager/DurationUtils");
const EmbedMessages_1 = require("../EmbedMessages");
const Decoder_1 = require("../Media/Decoder");
const httpsClient_1 = require("../../../Core/httpsClient");
const Platforms_1 = require("../../../Structures/Platforms");
const FFmpeg_1 = require("../Media/FFmpeg");
exports.SupportPlatforms = {
    "YOUTUBE": {
        "track": (search) => Platforms_1.YouTube.getVideo(search),
        "playlist": (search) => Platforms_1.YouTube.getPlaylist(search),
        "search": (search) => Platforms_1.YouTube.SearchVideos(search),
    },
    "SPOTIFY": {
        "track": (search) => Platforms_1.Spotify.getTrack(search),
        "playlist": (search) => Platforms_1.Spotify.getPlaylist(search),
        "search": (search) => Platforms_1.Spotify.SearchTracks(search),
        "album": (search) => Platforms_1.Spotify.getAlbum(search)
    },
    "SOUNDCLOUD": {
        "track": (search) => Platforms_1.SoundCloud.getTrack(search),
        "playlist": (search) => Platforms_1.SoundCloud.getPlaylist(search),
        "search": (search) => Platforms_1.SoundCloud.SearchTracks(search),
        "album": (search) => Platforms_1.SoundCloud.getPlaylist(search)
    },
    "VK": {
        "track": (search) => Platforms_1.VK.getTrack(search),
        "playlist": (search) => Platforms_1.VK.getPlaylist(search),
        "search": (search) => Platforms_1.VK.SearchTracks(search),
    },
    "Discord": {
        "track": (search) => new FFmpeg_1.FFmpeg.FFprobe(["-i", search]).getInfo().then((trackInfo) => {
            if (!trackInfo)
                return null;
            return {
                url: search,
                title: search.split("/").pop(),
                author: null,
                image: { url: EmbedMessages_1.Images.NotImage },
                duration: { seconds: trackInfo.format.duration },
                format: { url: trackInfo.format.filename }
            };
        })
    }
};
class Song {
    #_title;
    #_url;
    #_author;
    #_duration;
    #_image;
    #_requester;
    #_isLive;
    #_color;
    #_type;
    resourceLink;
    constructor(track, author) {
        const type = Type(track.url);
        this.#_title = track.title;
        this.#_url = track.url;
        this.#_author = {
            url: track.author?.url ?? `https://discordapp.com/users/${author.id}`,
            title: track.author?.title ?? author.username,
            image: track.author?.image ?? { url: EmbedMessages_1.Images.NotImage },
            isVerified: track.author?.isVerified ?? undefined
        };
        this.#_duration = ConstDuration(track.duration);
        this.#_image = track.image;
        this.#_requester = ConstRequester(author);
        this.#_isLive = track.isLive;
        this.#_color = Color(type);
        this.#_type = type;
        this.resourceLink = track?.format?.url;
    }
    get title() {
        return this.#_title;
    }
    ;
    get url() {
        return this.#_url;
    }
    ;
    get author() {
        return this.#_author;
    }
    ;
    get duration() {
        return this.#_duration;
    }
    ;
    get image() {
        return this.#_image;
    }
    ;
    get requester() {
        return this.#_requester;
    }
    ;
    get isLive() {
        return this.#_isLive;
    }
    ;
    get color() {
        return this.#_color;
    }
    ;
    get type() {
        return this.#_type;
    }
    ;
    resource = async (seek, filters, req = 0) => {
        if (req > 2)
            return null;
        if (!this.resourceLink)
            this.resourceLink = (await SongFinder.findResource(this))?.url;
        const checkResource = await httpsClient_1.httpsClient.checkLink(this.resourceLink);
        if (checkResource === "OK") {
            let params;
            if (this.isLive)
                params = { url: new Decoder_1.Decoder.Dash(this.resourceLink, this.url) };
            else
                params = { url: this.resourceLink, seek, filters };
            const DecodeFFmpeg = new Decoder_1.Decoder.All(params);
            ["close", "end", "error"].forEach((event) => DecodeFFmpeg.once(event, () => {
                [DecodeFFmpeg, params.url].forEach((clas) => typeof clas !== "string" && clas !== undefined ? clas.destroy() : null);
            }));
            return DecodeFFmpeg;
        }
        else
            return this.resource(seek, filters, req++);
    };
}
exports.Song = Song;
var SongFinder;
(function (SongFinder) {
    function findResource(song) {
        const { type, url, author, title, duration } = song;
        if (type === "SPOTIFY")
            return FindTrack(`${author.title} - ${title}`, duration.seconds);
        const FindPlatform = exports.SupportPlatforms[type];
        const FindCallback = FindPlatform["track"](url);
        return FindCallback.then((track) => track.format);
    }
    SongFinder.findResource = findResource;
    function FindTrack(nameSong, duration) {
        return Platforms_1.YouTube.SearchVideos(nameSong, { limit: 15 }).then((Tracks) => {
            const FindTracks = Tracks.filter((track) => {
                const DurationSong = DurationUtils_1.DurationUtils.ParsingTimeToNumber(track.duration.seconds);
                return DurationSong === duration || DurationSong < duration + 10 && DurationSong > duration - 10;
            });
            if (FindTracks.length === 0)
                return null;
            return Platforms_1.YouTube.getVideo(FindTracks[0].url).then((video) => video.format);
        });
    }
})(SongFinder || (SongFinder = {}));
function ConstRequester({ id, username, avatar }) {
    return { username, id, avatarURL: () => `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp` };
}
function ConstDuration(duration) {
    const seconds = parseInt(duration.seconds);
    return { seconds, StringTime: seconds > 0 ? DurationUtils_1.DurationUtils.ParsingTimeToString(seconds) : "Live" };
}
function Color(type) {
    switch (type) {
        case "YOUTUBE": return LiteUtils_1.Colors.RED;
        case "SPOTIFY": return LiteUtils_1.Colors.GREEN;
        case "SOUNDCLOUD": return LiteUtils_1.Colors.ORANGE;
        case "VK": return LiteUtils_1.Colors.BLUE_DARK;
        case "TWITCH": return LiteUtils_1.Colors.PURPLE;
        default: return LiteUtils_1.Colors.BLUE;
    }
}
function Type(url) {
    try {
        let start = url.split("://")[1].split("/")[0];
        let split = start.split(".");
        return (split[split.length - 2]).toUpperCase();
    }
    catch {
        return "UNKNOWN";
    }
}
