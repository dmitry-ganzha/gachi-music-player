"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedMessages = exports.Images = void 0;
const LiteUtils_1 = require("../../Core/Utils/LiteUtils");
const DurationUtils_1 = require("../Manager/DurationUtils");
const Bar = {
    Enable: true,
    empty: "─",
    full: "─",
    button: "⚪"
};
var Images;
(function (Images) {
    Images.Verification = "https://cdn.discordapp.com/attachments/860113484493881365/986005795038715904/Ok.png";
    Images.NotVerification = "https://cdn.discordapp.com/attachments/860113484493881365/986005794849980486/Not.png";
    Images.NotFound = "https://cdn.discordapp.com/attachments/860113484493881365/986005794627670086/WTF.png";
    Images.NotImage = "https://cdn.discordapp.com/attachments/860113484493881365/940926476746883082/MusciNote.png";
})(Images = exports.Images || (exports.Images = {}));
var EmbedMessages;
(function (EmbedMessages) {
    function toPlay(client, song, queue) {
        return {
            color: song.color,
            author: {
                name: client.replaceText(song.author.title, 45, false),
                iconURL: song.author.isVerified === undefined ? Images.NotFound : song.author.isVerified ? Images.Verification : Images.NotVerification,
                url: song.author.url,
            },
            thumbnail: {
                url: song.author?.image?.url ?? Images.NotImage,
            },
            fields: CurrentPlayFunction.getFields(song, queue, client),
            image: {
                url: song.image?.url ?? null
            },
            footer: {
                text: `${song.requester.username} | ${DurationUtils_1.DurationUtils.getTimeQueue(queue)} | 🎶: ${queue.songs.length}`,
                iconURL: song.requester.avatarURL(),
            }
        };
    }
    EmbedMessages.toPlay = toPlay;
    function toPushSong(client, { color, author, image, title, url, duration, requester, type }, { songs }) {
        return {
            color,
            author: {
                name: client.replaceText(author.title, 45, false),
                iconURL: author.isVerified === undefined ? Images.NotFound : author.isVerified ? Images.Verification : Images.NotVerification,
                url: author.url,
            },
            thumbnail: {
                url: !image?.url ? author?.image.url : image?.url ?? Images.NotImage,
            },
            fields: [{
                    name: "Добавлено в очередь",
                    value: `**❯** [${client.replaceText(title, 40, true)}](${url}})\n**❯** [${duration.StringTime}]`
                }],
            footer: {
                text: `${requester.username} | ${DurationUtils_1.DurationUtils.getTimeQueue(songs)} | 🎶: ${songs.length}`,
                iconURL: requester.avatarURL(),
            }
        };
    }
    EmbedMessages.toPushSong = toPushSong;
    function toPushPlaylist({ client, author: DisAuthor }, { author, image, url, title, items }) {
        return {
            color: LiteUtils_1.Colors.BLUE,
            author: {
                name: author?.title,
                iconURL: author?.image?.url ?? Images.NotImage,
                url: author?.url,
            },
            thumbnail: {
                url: typeof image === "string" ? image : image.url ?? Images.NotImage
            },
            description: `Найден плейлист [${title}](${url})`,
            timestamp: new Date(),
            footer: {
                text: `${DisAuthor.username} | ${DurationUtils_1.DurationUtils.getTimeQueue(items)} | 🎶: ${items?.length}`,
                iconURL: DisAuthor.displayAvatarURL({}),
            }
        };
    }
    EmbedMessages.toPushPlaylist = toPushPlaylist;
    function toError(client, { color, author, image, title, url, duration, requester, type }, { songs }, err) {
        return {
            color,
            description: `\n[${title}](${url})\n\`\`\`js\n${err}...\`\`\``,
            author: {
                name: client.replaceText(author.title, 45, false),
                iconURL: author.isVerified === undefined ? Images.NotFound : author.isVerified ? Images.Verification : Images.NotVerification,
                url: author.url,
            },
            thumbnail: {
                url: image?.url ?? Images.NotImage,
            },
            timestamp: new Date(),
            footer: {
                text: `${requester.username} | ${DurationUtils_1.DurationUtils.getTimeQueue(songs)} | 🎶: ${songs.length}`,
                iconURL: requester?.avatarURL() ?? client.user.displayAvatarURL(),
            }
        };
    }
    EmbedMessages.toError = toError;
    function toBuffering(client, { color, author, image, title, url, duration, requester, type }, { songs }) {
        return {
            color,
            description: `**❯** [${title}](${url})\nДанный трек загружается. Это может занять некоторое время!`,
            timestamp: new Date(),
            author: {
                name: client.replaceText(author.title, 45, false),
                iconURL: author.isVerified === undefined ? Images.NotFound : author.isVerified ? Images.Verification : Images.NotVerification,
                url: author.url,
            },
            thumbnail: {
                url: image?.url ?? Images.NotImage,
            },
            footer: {
                text: `${requester.username} | ${DurationUtils_1.DurationUtils.getTimeQueue(songs)} | 🎶: ${songs.length}`,
                iconURL: requester?.avatarURL() ?? client.user.displayAvatarURL(),
            }
        };
    }
    EmbedMessages.toBuffering = toBuffering;
})(EmbedMessages = exports.EmbedMessages || (exports.EmbedMessages = {}));
var CurrentPlayFunction;
(function (CurrentPlayFunction) {
    function getFields(song, { player, songs, audioFilters }, client) {
        const playbackDuration = ConvertTime(player, audioFilters);
        const VisualDuration = MusicDuration(song, playbackDuration);
        let fields = [{ name: "Щас играет", value: `**❯** [${client.replaceText(song.title, 29, true)}](${song.url})\n${VisualDuration}` }];
        if (songs[1])
            fields.push({ name: "Потом", value: `**❯** [${client.replaceText(songs[1].title, 29, true)}](${songs[1].url})` });
        return fields;
    }
    CurrentPlayFunction.getFields = getFields;
    function MusicDuration({ isLive, duration }, curTime) {
        if (isLive)
            return `[${duration.StringTime}]`;
        const str = `${duration.StringTime}]`;
        const parsedTimeSong = curTime >= duration.seconds ? duration.StringTime : DurationUtils_1.DurationUtils.ParsingTimeToString(curTime);
        const progress = ProgressBar(curTime, duration.seconds, 15);
        if (Bar.Enable)
            return `**❯** [${parsedTimeSong} - ${str}\n${progress}`;
        return `**❯** [${curTime} - ${str}`;
    }
    function ConvertTime({ playbackDuration }, filters) {
        if (Bar.Enable)
            return playbackDuration;
        return DurationUtils_1.DurationUtils.ParsingTimeToString(playbackDuration);
    }
    function ProgressBar(currentTime, maxTime, size = 15) {
        const CurrentDuration = currentTime > maxTime ? maxTime : currentTime;
        const progressSize = Math.round(size * (CurrentDuration / maxTime));
        const progressText = Bar.full.repeat(progressSize);
        const emptyText = Bar.empty.repeat(size - progressSize);
        return `${progressText}${Bar.button}${emptyText}`;
    }
})(CurrentPlayFunction || (CurrentPlayFunction = {}));
