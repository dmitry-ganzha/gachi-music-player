"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlayerController = void 0;
const AudioPlayer_1 = require("./AudioPlayer");
const DurationUtils_1 = require("../Manager/DurationUtils");
const ParsingTimeToString = DurationUtils_1.DurationUtils.ParsingTimeToString;
var PlayerController;
(function (PlayerController) {
    function toResume(message) {
        const { client, guild, author } = message;
        const { player, songs } = client.queue.get(guild.id);
        const { title, color } = songs[0];
        if (player.state.status === "paused") {
            player.resume();
            return client.sendMessage({ text: `▶️ | Resume song | ${title}`, message, type: "css", color });
        }
        return client.sendMessage({ text: `${author}, Текущий статус плеера [${player.state.status}]`, message, color: "RED" });
    }
    PlayerController.toResume = toResume;
    function toPause(message) {
        const { client, guild, author } = message;
        const { player, songs } = client.queue.get(guild.id);
        const { title, color } = songs[0];
        if (player.state.status === "playing") {
            player.pause();
            return client.sendMessage({ text: `⏸ | Pause song | ${title}`, message, type: "css", color });
        }
        return client.sendMessage({ text: `${author}, Текущий статус плеера [${player.state.status}]`, message, color: "RED" });
    }
    PlayerController.toPause = toPause;
    function toRemove(message, args) {
        const { client, guild, member, author } = message;
        const { player, songs } = client.queue.get(guild.id);
        const { title, color, requester, url } = songs[args - 1];
        setImmediate(() => {
            const voiceConnection = client.connections(guild);
            const UserToVoice = !!voiceConnection.find((v) => v.id === songs[0].requester.id);
            if (!AudioPlayer_1.StatusPlayerHasSkipped.has(player.state.status))
                return client.sendMessage({
                    text: `${author}, ⚠ Музыка еще не играет!`,
                    message,
                    color: "RED"
                });
            if (songs.length <= 1)
                return toStop(message);
            if (member.permissions.has("Administrator") || author.id === requester.id || !UserToVoice) {
                songs.splice(args - 1, 1);
                if (args === 1)
                    toStop(message);
                return client.sendMessage({ text: `⏭️ | Remove song | ${title}`, message, type: "css", color });
            }
            return client.sendMessage({ text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: "RED" });
        });
    }
    PlayerController.toRemove = toRemove;
    function toSeek(message, seek) {
        const { client, guild, author } = message;
        const queue = client.queue.get(guild.id);
        const player = queue.player;
        const { title, color } = queue.songs[0];
        try {
            client.sendMessage({ text: `⏭️ | Seeking to [${ParsingTimeToString(seek)}] song | ${title}`, message, type: "css", color });
            return player.play(queue, seek);
        }
        catch {
            return client.sendMessage({ text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: "RED" });
        }
    }
    PlayerController.toSeek = toSeek;
    function toSkip(message, args) {
        if (args)
            return toSkipNumber(message, args);
        const { client, guild, member, author } = message;
        const { songs, player } = client.queue.get(guild.id);
        const { title, color, requester, url } = songs[0];
        setImmediate(() => {
            const voiceConnection = client.connections(guild);
            const UserToVoice = !!voiceConnection.find((v) => v.id === requester.id);
            if (!AudioPlayer_1.StatusPlayerHasSkipped.has(player.state.status))
                return client.sendMessage({
                    text: `${author}, ⚠ Музыка еще не играет!`,
                    message,
                    color: "RED"
                });
            if (member.permissions.has("Administrator") || author.id === requester.id || !UserToVoice) {
                if (AudioPlayer_1.StatusPlayerHasSkipped.has(player.state.status)) {
                    client.sendMessage({ text: `⏭️ | Skip song | ${title}`, message, type: "css", color });
                    return toStop(message);
                }
            }
            return client.sendMessage({ text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: "RED" });
        });
    }
    PlayerController.toSkip = toSkip;
    function toReplay(message) {
        const { client, guild, author } = message;
        const queue = client.queue.get(guild.id);
        const player = queue.player;
        const { title, color } = queue.songs[0];
        try {
            client.sendMessage({ text: `🔂 | Replay | ${title}`, message, color, type: "css" });
            return player.play(queue);
        }
        catch {
            return client.sendMessage({ text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: "RED" });
        }
    }
    PlayerController.toReplay = toReplay;
    function toFilter(message) {
        const { client, guild, author } = message;
        const queue = client.queue.get(guild.id);
        const player = queue.player;
        const seek = player.playbackDuration;
        try {
            return player.play(queue, seek);
        }
        catch {
            return client.sendMessage({ text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: "RED" });
        }
    }
    PlayerController.toFilter = toFilter;
})(PlayerController = exports.PlayerController || (exports.PlayerController = {}));
function toSkipNumber(message, args) {
    const { client, guild, member, author } = message;
    const queue = client.queue.get(guild.id);
    const { title, color, requester, url } = queue.songs[args - 1];
    setImmediate(() => {
        const voiceConnection = client.connections(guild);
        const UserToVoice = !!voiceConnection.find((v) => v.id === queue.songs[0].requester.id);
        if (!AudioPlayer_1.StatusPlayerHasSkipped.has(queue.player.state.status))
            return client.sendMessage({
                text: `${author}, ⚠ Музыка еще не играет!`,
                message,
                color: "RED"
            });
        if (args > queue.songs.length)
            return client.sendMessage({
                text: `${author}, В очереди ${queue.songs.length}!`,
                message,
                color: "RED"
            });
        if (member.permissions.has("Administrator") || author.id === requester.id || !UserToVoice) {
            if (queue.options.loop === "songs")
                for (let i = 0; i < args - 2; i++)
                    queue.songs.push(queue.songs.shift());
            else
                queue.songs = queue.songs.slice(args - 2);
            client.sendMessage({ text: `⏭️ | Skip to song [${args}] | ${title}`, message, type: "css", color });
            return toStop(message);
        }
        return client.sendMessage({ text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: "RED" });
    });
}
function toStop(message) {
    const { client, guild } = message;
    const { player } = client.queue.get(guild.id);
    if (AudioPlayer_1.StatusPlayerHasSkipped.has(player.state.status))
        setTimeout(player.stop, 300);
}
