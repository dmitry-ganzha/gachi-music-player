"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmbedMessages = void 0;
const DurationUtils_1 = require("@Managers/DurationUtils");
const Command_1 = require("@Structures/Handle/Command");
const Config_json_1 = require("@db/Config.json");
const discord_js_1 = require("discord.js");
function checkVer(isVer) {
    if (isVer === undefined)
        return Config_json_1.Music.images._found;
    else if (isVer)
        return Config_json_1.Music.images.ver;
    return Config_json_1.Music.images._ver;
}
var EmbedMessages;
(function (EmbedMessages) {
    function toPlay(client, queue) {
        const { color, author, image, requester } = queue.song;
        const fields = getFields(queue, client);
        const AuthorSong = Command_1.replacer.replaceText(author.title, 45, false);
        return { color, image, thumbnail: author?.image ?? { url: Config_json_1.Music.images._image }, fields,
            author: { name: AuthorSong, url: author.url, iconURL: checkVer(author.isVerified) },
            footer: { text: `${requester.username} | ${DurationUtils_1.DurationUtils.getTimeQueue(queue)} | 🎶: ${queue.songs.length}`, iconURL: requester.avatarURL() }
        };
    }
    EmbedMessages.toPlay = toPlay;
    function toPushSong(client, song, { songs }) {
        const { color, author, image, title, url, duration, requester } = song;
        const AuthorSong = Command_1.replacer.replaceText(author.title, 45, false);
        const fields = [{ name: "**Добавлено в очередь**", value: `**❯** **[${Command_1.replacer.replaceText(title, 40, true)}](${url}})\n**❯** \`\`[${duration.full}]\`\`**` }];
        return { color, fields,
            author: { name: AuthorSong, iconURL: author?.image?.url ?? Config_json_1.Music.images._image, url: author.url },
            thumbnail: !image?.url ? author?.image : image ?? { url: Config_json_1.Music.images._image },
            footer: { text: `${requester.username} | ${DurationUtils_1.DurationUtils.getTimeQueue(songs)} | 🎶: ${songs.length}`, iconURL: requester.avatarURL() }
        };
    }
    EmbedMessages.toPushSong = toPushSong;
    function toPushPlaylist({ client, author: DisAuthor }, playlist) {
        const { author, image, url, title, items } = playlist;
        return { color: discord_js_1.Colors.Blue, timestamp: new Date(),
            author: { name: author?.title, iconURL: author?.image?.url ?? Config_json_1.Music.images._image, url: author?.url },
            thumbnail: typeof image === "string" ? { url: image } : image ?? { url: Config_json_1.Music.images._image },
            description: `Найден плейлист **[${title}](${url})**`,
            footer: { text: `${DisAuthor.username} | ${DurationUtils_1.DurationUtils.getTimeQueue(items)} | 🎶: ${items?.length}`, iconURL: DisAuthor.displayAvatarURL({}) }
        };
    }
    EmbedMessages.toPushPlaylist = toPushPlaylist;
    function toError(client, { songs, song }, err) {
        const { color, author, image, title, url, requester } = song;
        const AuthorSong = Command_1.replacer.replaceText(author.title, 45, false);
        return { color, thumbnail: image ?? { url: Config_json_1.Music.images._image }, timestamp: new Date(),
            description: `\n[${title}](${url})\n\`\`\`js\n${err}...\`\`\``,
            author: { name: AuthorSong, url: author.url, iconURL: checkVer(author.isVerified) },
            footer: { text: `${requester.username} | ${DurationUtils_1.DurationUtils.getTimeQueue(songs)} | 🎶: ${songs.length}`, iconURL: requester?.avatarURL() ?? client.user.displayAvatarURL() }
        };
    }
    EmbedMessages.toError = toError;
})(EmbedMessages = exports.EmbedMessages || (exports.EmbedMessages = {}));
function getFields(queue, client) {
    const { songs, song, player } = queue;
    const VisualDuration = toString(song.duration, player.streamDuration);
    const fields = [{ name: `**Щас играет**`, value: `**❯** **[${Command_1.replacer.replaceText(song.title, 29, true)}](${song.url})**\n${VisualDuration}` }];
    if (songs.length > 1)
        fields.push({ name: `**Потом**`, value: `**❯** **[${Command_1.replacer.replaceText(songs[1].title, 29, true)}](${songs[1].url})**` });
    return fields;
}
function toString(duration, playDuration) {
    if (duration.full === "Live" || !Config_json_1.Music.ProgressBar.enable)
        return `\`\`[${duration}]\`\``;
    const parsedDuration = DurationUtils_1.DurationUtils.ParsingTimeToString(playDuration);
    const progress = matchBar(playDuration, duration.seconds, 20);
    const string = `**❯** \`\`[${parsedDuration} \\ ${duration.full}]\`\` \n\`\``;
    return `${string}${progress}\`\``;
}
function matchBar(currentTime, maxTime, size = 15) {
    try {
        const CurrentDuration = isNaN(currentTime) ? 0 : currentTime;
        const progressSize = Math.round(size * (CurrentDuration / maxTime));
        const progressText = Config_json_1.Music.ProgressBar.full.repeat(progressSize);
        const emptyText = Config_json_1.Music.ProgressBar.empty.repeat(size - progressSize);
        return `${progressText}${Config_json_1.Music.ProgressBar.button}${emptyText}`;
    }
    catch (err) {
        if (err === "RangeError: Invalid count value")
            return "**❯** \`\`[Error value]\`\`";
        return "**❯** \`\`[Loading]\`\`";
    }
}
