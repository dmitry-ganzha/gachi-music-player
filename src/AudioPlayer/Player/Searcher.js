"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Searcher = void 0;
const DurationUtils_1 = require("../Manager/DurationUtils");
const Song_1 = require("../Structures/Queue/Song");
const youtubeStr = /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi;
const spotifySrt = /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi;
const SoundCloudSrt = /^(?:(https?):\/\/)?(?:(?:www|m)\.)?(api\.soundcloud\.com|soundcloud\.com|snd\.sc)\/(.*)$/;
const UrlSrt = /^(https?:\/\/)/gi;
var Searcher;
(function (Searcher) {
    function toPlayer(options) {
        const { search, message, voiceChannel } = options;
        const type = toPlayerUtils.typeSong(search);
        const platform = toPlayerUtils.PlatformSong(search, message);
        if (!message.attachments?.last()?.url)
            message.client.sendMessage({ text: `Поиск 🔍 | ${search}`, message, color: "YELLOW", type: "css" });
        const findPlatform = Song_1.SupportPlatforms[platform];
        const findCallback = findPlatform[type];
        if (!findPlatform)
            return message.client.sendMessage({ text: `${message.author}, у меня нет поддержки такой платформы!`, color: "RED", message });
        else if (!findCallback)
            return message.client.sendMessage({ text: `${message.author}, у меня нет поддержки этого типа запроса!`, color: "RED", message });
        const newSearch = type === "search" && search?.match(platform) ? search.split(platform)[1] : search;
        const runPromise = findCallback(newSearch);
        runPromise.then((info) => {
            if (!info)
                return message.client.sendMessage({ text: `${message.author}, данные не были найдены!`, color: "YELLOW", message });
            if (info instanceof Array)
                return SearchSongMessage.toSend(info, info.length, { ...options, platform, type });
            if (type !== "playlist")
                message.client.sendMessage({ text: `Найден 🔍 | ${type} | ${info.title}`, message, color: "YELLOW", type: "css" });
            return message.client.player.emit("play", message, voiceChannel, info);
        });
        runPromise.catch((err) => message.client.sendMessage({ text: `${message.author}, данные не были найдены! \nError: ${err}`, color: "RED", message }));
    }
    Searcher.toPlayer = toPlayer;
})(Searcher = exports.Searcher || (exports.Searcher = {}));
var toPlayerUtils;
(function (toPlayerUtils) {
    function typeSong(search) {
        if (!search)
            return "track";
        if (search.match(/playlist/))
            return "playlist";
        else if (search.match(/album/) || search.match(/sets/))
            return "album";
        else if (search.match(UrlSrt))
            return "track";
        return "search";
    }
    toPlayerUtils.typeSong = typeSong;
    function PlatformSong(search, message) {
        if (!search)
            return "Discord";
        if (search.match(UrlSrt)) {
            if (search.match(youtubeStr))
                return "YOUTUBE";
            else if (search.match(spotifySrt))
                return "SPOTIFY";
            else if (search.match(/vk.com/))
                return "VK";
            else if (search.match(SoundCloudSrt))
                return "SOUNDCLOUD";
            else if (search.match(/cdn.discordapp.com/) || message.attachments?.last()?.url)
                return "Discord";
        }
        const SplitSearch = search.split(' ');
        const FindType = SplitSearch[0].toLowerCase();
        if (FindType.length > 2)
            return "YOUTUBE";
        return FindType;
    }
    toPlayerUtils.PlatformSong = PlatformSong;
})(toPlayerUtils || (toPlayerUtils = {}));
var SearchSongMessage;
(function (SearchSongMessage) {
    function toSend(results, num, options) {
        const { message, platform } = options;
        setImmediate(() => {
            if (results.length < 1)
                return message.client.sendMessage({ text: `${message.author} | Я не смог найти музыку с таким названием. Попробуй другое название!`, message, color: "RED" });
            const ConstFind = `Выбери от 1 до ${results.length}`;
            const Requester = `[Платформа: ${platform} | Запросил: ${message.author.username}]`;
            const resp = ArrayToString(results, message, platform);
            message.channel.send(`\`\`\`css\n${ConstFind}\n${Requester}\n\n${resp}\`\`\``).then((msg) => {
                const collector = CreateMessageCollector(msg, message, num);
                Reaction(msg, message, "❌", () => {
                    deleteMessage(msg);
                    collector?.stop();
                });
                collector.once("collect", (m) => {
                    setImmediate(() => {
                        [msg, m].forEach((m) => deleteMessage(m));
                        collector?.stop();
                        const url = results[parseInt(m.content) - 1].url;
                        return Searcher.toPlayer({ ...options, type: "track", search: url });
                    });
                });
                return;
            });
        });
    }
    SearchSongMessage.toSend = toSend;
    function Reaction(msg, message, emoji, callback) {
        setImmediate(() => {
            msg.react(emoji).then(() => {
                const collector = msg.createReactionCollector({
                    filter: (reaction, user) => (reaction.emoji.name === emoji && user.id !== message.client.user.id),
                    max: 1,
                    time: 60e3
                });
                collector.once("collect", () => {
                    collector?.stop();
                    return callback();
                });
            });
        });
    }
    function CreateMessageCollector(msg, message, num) {
        return msg.channel.createMessageCollector({
            filter: (m) => !isNaN(m.content) && m.content <= num && m.content > 0 && m.author.id === message.author.id,
            max: 1,
            time: 60e3
        });
    }
    function ArrayToString(results, message, type) {
        let NumberTrack = 1, StringTracks;
        results.ArraySort(15).forEach((tracks) => {
            StringTracks = tracks.map((track) => {
                const Duration = type === "YOUTUBE" ? track.duration.seconds : DurationUtils_1.DurationUtils.ParsingTimeToString(parseInt(track.duration.seconds));
                const NameTrack = `[${message.client.replaceText(track.title, 80, true)}]`;
                const DurationTrack = `[${Duration ?? "LIVE"}]`;
                const AuthorTrack = `[${message.client.replaceText(track.author.title, 12, true)}]`;
                return `${NumberTrack++} ➜ ${DurationTrack} | ${AuthorTrack} | ${NameTrack}`;
            }).join("\n");
        });
        return StringTracks;
    }
    function deleteMessage(msg) {
        setTimeout(() => msg.delete().catch(() => null), 1e3);
    }
})(SearchSongMessage || (SearchSongMessage = {}));
