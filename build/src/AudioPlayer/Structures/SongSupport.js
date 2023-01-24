"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPlayer = exports.SongFinder = exports.platformSupporter = void 0;
const _APIs_1 = require("@APIs");
const interactionCreate_1 = require("@Client/interactionCreate");
const Config_json_1 = require("@db/Config.json");
const DurationUtils_1 = require("@Managers/DurationUtils");
const Command_1 = require("@Structures/Handle/Command");
const ArraySort_1 = require("@Structures/ArraySort");
const discord_js_1 = require("discord.js");
const _FFspace_1 = require("@FFspace");
const _env_1 = require("@env");
const emoji = Config_json_1.ReactionMenuSettings.emojis.cancel;
const RegisterPlatform = [];
(() => {
    if (!_env_1.env.get("SPOTIFY_ID") || !_env_1.env.get("SPOTIFY_SECRET"))
        RegisterPlatform.push("SPOTIFY");
    if (!_env_1.env.get("VK_TOKEN"))
        RegisterPlatform.push("VK");
})();
const PlatformsAudio = ["SPOTIFY", "YANDEX"];
const Platforms = {
    "YOUTUBE": {
        "color": 0xed4245,
        "prefix": ["yt", "ytb"],
        "reg": /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi,
        "callbacks": {
            "track": _APIs_1.YouTube.getVideo,
            "playlist": _APIs_1.YouTube.getPlaylist,
            "search": _APIs_1.YouTube.SearchVideos
        }
    },
    "SPOTIFY": {
        "color": 1420288,
        "prefix": ["sp"],
        "reg": /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi,
        "callbacks": {
            "track": _APIs_1.Spotify.getTrack,
            "playlist": _APIs_1.Spotify.getPlaylist,
            "album": _APIs_1.Spotify.getAlbum,
            "search": _APIs_1.Spotify.SearchTracks
        }
    },
    "SOUNDCLOUD": {
        "color": 0xe67e22,
        "prefix": ["sc"],
        "reg": /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi,
        "callbacks": {
            "track": _APIs_1.SoundCloud.getTrack,
            "playlist": _APIs_1.SoundCloud.getPlaylist,
            "album": _APIs_1.SoundCloud.getPlaylist,
            "search": _APIs_1.SoundCloud.SearchTracks
        }
    },
    "VK": {
        "color": 30719,
        "prefix": ["vk"],
        "reg": /vk.com/gi,
        "callbacks": {
            "track": _APIs_1.VK.getTrack,
            "playlist": _APIs_1.VK.getPlaylist,
            "search": _APIs_1.VK.SearchTracks
        }
    },
    "YANDEX": {
        "color": discord_js_1.Colors.Yellow,
        "prefix": ["ym", "yandex", "y"],
        "reg": /music.yandex.ru/gi,
        "callbacks": {
            "track": _APIs_1.YandexMusic.getTrack,
            "album": _APIs_1.YandexMusic.getAlbum,
            "search": _APIs_1.YandexMusic.SearchTracks
        }
    },
    "DISCORD": {
        "color": discord_js_1.Colors.Grey,
        "reg": /^(https?:\/\/)?(cdn\.)?( )?(discordapp)\/.+$/gi,
        "callbacks": {
            "track": (url) => _FFspace_1.FFspace.FFprobe(url).then((trackInfo) => {
                if (!trackInfo)
                    return null;
                return {
                    url, author: null, image: { url: Config_json_1.Music.images._image },
                    title: url.split("/").pop(),
                    duration: { seconds: trackInfo.format.duration },
                    format: { url: trackInfo.format.filename }
                };
            })
        }
    }
};
var platformSupporter;
(function (platformSupporter) {
    function getColor(platform) { return Platforms[platform].color; }
    platformSupporter.getColor = getColor;
    function getFailPlatform(platform) { return RegisterPlatform?.includes(platform) ?? false; }
    platformSupporter.getFailPlatform = getFailPlatform;
    function getCallback(platform, type = "track") {
        const plt = Platforms[platform]["callbacks"];
        if (!plt)
            return "!platform";
        const clb = plt[type];
        if (!clb)
            return "!callback";
        return clb;
    }
    platformSupporter.getCallback = getCallback;
    function getTypeSong(str) {
        if (!str)
            return "track";
        if (str.match(/^(https?:\/\/)/gi)) {
            if (str.match(/playlist/))
                return "playlist";
            else if ((str.match(/album/) || str.match(/sets/)) && !str.match(/track/))
                return "album";
            return "track";
        }
        return "search";
    }
    platformSupporter.getTypeSong = getTypeSong;
    function getPlatform(str) {
        const platforms = Object.entries(Platforms);
        try {
            if (str.match(/^(https?:\/\/)/gi)) {
                const filterPlatforms = platforms.filter(([, value]) => str.match(value.reg));
                const [key] = filterPlatforms[0];
                if (key)
                    return key.toUpperCase();
                return "DISCORD";
            }
            else {
                try {
                    const spSearch = str.split(' '), pl = spSearch[0].toLowerCase();
                    const platform = platforms.filter(([, value]) => "prefix" in value && value?.prefix.includes(pl));
                    const [key] = platform[0];
                    return key.toUpperCase();
                }
                catch (e) {
                    return "YOUTUBE";
                }
            }
        }
        catch (e) {
            return "DISCORD";
        }
    }
    platformSupporter.getPlatform = getPlatform;
    function getArg(str, platform) {
        if (!str)
            return str;
        if (str.match(/^(https?:\/\/)/gi))
            return str;
        const spSearch = str.split(' '), pl = spSearch[0].toLowerCase();
        const aliases = pl === platform.toLowerCase() || Platforms[platform].prefix?.includes(pl);
        if (aliases) {
            spSearch.splice(0, 1);
            return spSearch.join(" ");
        }
        return str;
    }
    platformSupporter.getArg = getArg;
})(platformSupporter = exports.platformSupporter || (exports.platformSupporter = {}));
var SongFinder;
(function (SongFinder) {
    function getLinkResource(song) {
        const { platform, url, author, title, duration } = song;
        if (PlatformsAudio.includes(platform))
            return FindTrack(`${author.title} - ${title} (Lyrics)`, duration.seconds);
        const callback = platformSupporter.getCallback(platform);
        if (callback === "!platform" || callback === "!callback")
            return null;
        return callback(url).then((track) => track?.format?.url);
    }
    SongFinder.getLinkResource = getLinkResource;
    function FindTrack(nameSong, duration) {
        return _APIs_1.YouTube.SearchVideos(nameSong, { limit: 20 }).then((Tracks) => {
            const FindTracks = Tracks.filter((track) => {
                const DurationSong = DurationUtils_1.DurationUtils.ParsingTimeToNumber(track.duration.seconds);
                return DurationSong === duration || DurationSong < duration + 7 && DurationSong > duration - 5;
            });
            if (FindTracks?.length < 1)
                return null;
            return _APIs_1.YouTube.getVideo(FindTracks[0].url).then((video) => video?.format?.url);
        });
    }
})(SongFinder = exports.SongFinder || (exports.SongFinder = {}));
var toPlayer;
(function (toPlayer) {
    function play(message, arg) {
        const { author, client } = message;
        const voiceChannel = message.member.voice;
        const type = platformSupporter.getTypeSong(arg);
        const platform = platformSupporter.getPlatform(arg);
        const argument = platformSupporter.getArg(arg, platform);
        if (platformSupporter.getFailPlatform(platform))
            return interactionCreate_1.UtilsMsg.createMessage({
                text: `${author}, я не могу взять данные с этой платформы **${platform}**\n Причина: [**Authorization data not found**]`, color: "DarkRed", message
            });
        const callback = platformSupporter.getCallback(platform, type);
        if (callback === "!platform")
            return interactionCreate_1.UtilsMsg.createMessage({
                text: `${author}, у меня нет поддержки такой платформы!\nПлатформа **${platform}**!`, color: "DarkRed", message
            });
        else if (callback === "!callback")
            return interactionCreate_1.UtilsMsg.createMessage({
                text: `${author}, у меня нет поддержки этого типа запроса!\nТип запроса **${type}**!\nПлатформа: **${platform}**`, color: "DarkRed", message
            });
        const runCallback = callback(argument);
        runCallback.catch((err) => interactionCreate_1.UtilsMsg.createMessage({ text: `${author}, данные не были найдены!\nПричина: ${err}`, color: "DarkRed", message }));
        runCallback.then((data) => {
            if (!data)
                return interactionCreate_1.UtilsMsg.createMessage({ text: `${author}, данные не были найдены!`, color: "Yellow", message });
            if (data instanceof Array)
                return toSend(data, { message, platform });
            return client.player.play(message, voiceChannel.channel, data);
        });
    }
    toPlayer.play = play;
})(toPlayer = exports.toPlayer || (exports.toPlayer = {}));
function toSend(results, options) {
    const { message, platform } = options;
    const { author, client } = message;
    if (results.length < 1)
        return interactionCreate_1.UtilsMsg.createMessage({ text: `${author} | Я не смог найти музыку с таким названием. Попробуй другое название!`, color: "DarkRed", message });
    const choice = `Выбери от 1 до ${results.length}`;
    const requester = `[Платформа: ${platform} | Запросил: ${author.username}]`;
    const songsList = (0, ArraySort_1.ArraySort)(15, results, (track, index) => {
        const Duration = platform === "YOUTUBE" ? track.duration.seconds : DurationUtils_1.DurationUtils.ParsingTimeToString(parseInt(track.duration.seconds));
        const NameTrack = `[${Command_1.replacer.replaceText(track.title, 80, true)}]`;
        const DurationTrack = `[${Duration ?? "LIVE"}]`;
        const AuthorTrack = `[${Command_1.replacer.replaceText(track.author.title, 12, true)}]`;
        return `${index + 1} ➜ ${DurationTrack} | ${AuthorTrack} | ${NameTrack}`;
    }, "\n");
    const callback = (msg) => {
        const collector = interactionCreate_1.UtilsMsg.createCollector(msg.channel, (m) => {
            const messageNum = parseInt(m.content);
            return !isNaN(messageNum) && messageNum <= results.length && messageNum > 0 && m.author.id === author.id;
        });
        interactionCreate_1.UtilsMsg.createReaction(msg, emoji, (reaction, user) => reaction.emoji.name === emoji && user.id !== client.user.id, () => {
            interactionCreate_1.UtilsMsg.deleteMessage(msg, 1e3);
            collector?.stop();
        }, 30e3);
        setTimeout(() => {
            interactionCreate_1.UtilsMsg.deleteMessage(msg, 1e3);
            collector?.stop();
        }, 30e3);
        collector.once("collect", (m) => {
            setImmediate(() => {
                [msg, m].forEach(interactionCreate_1.UtilsMsg.deleteMessage);
                collector?.stop();
                const url = results[parseInt(m.content) - 1].url;
                return toPlayer.play(message, url);
            });
        });
    };
    message.channel.send(`\`\`\`css\n${choice}\n${requester}\n\n${songsList}\`\`\``).then((msg) => {
        return callback(msg);
    });
}
