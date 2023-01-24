"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Player = void 0;
const interactionCreate_1 = require("@Client/interactionCreate");
const DurationUtils_1 = require("@Managers/DurationUtils");
const _VoiceManager_1 = require("@VoiceManager");
const QueueManager_1 = require("@Managers/QueueManager");
var Player;
(function (Player) {
    Player.play = QueueManager_1.toQueue;
    function resume(message) {
        const { client, guild } = message;
        const { player, song } = client.queue.get(guild.id);
        const { title, color } = song;
        player.resume();
        return interactionCreate_1.UtilsMsg.createMessage({ text: `▶️ | Resume song | ${title}`, message, codeBlock: "css", color });
    }
    Player.resume = resume;
    function pause(message) {
        const { client, guild } = message;
        const { player, song } = client.queue.get(guild.id);
        const { title, color } = song;
        player.pause();
        return interactionCreate_1.UtilsMsg.createMessage({ text: `⏸ | Pause song | ${title}`, message, codeBlock: "css", color });
    }
    Player.pause = pause;
    function remove(message, args) {
        const { client, guild, member, author } = message;
        const queue = client.queue.get(guild.id);
        const { player, songs, song } = queue;
        const { title, color, requester, url } = songs[args - 1];
        setImmediate(() => {
            const voiceConnection = _VoiceManager_1.Voice.Members(guild);
            const UserToVoice = !!voiceConnection.find((v) => v.id === song.requester.id);
            if (!player.hasSkipped)
                return interactionCreate_1.UtilsMsg.createMessage({ text: `${author}, ⚠ Музыка еще не играет!`, message, color: "DarkRed" });
            if (member.permissions.has("Administrator") || author.id === requester.id || !UserToVoice) {
                if (args === 1)
                    toStop(message);
                queue.songs.splice(args - 1, 1);
                return interactionCreate_1.UtilsMsg.createMessage({ text: `⏭️ | Remove song | ${title}`, message, codeBlock: "css", color });
            }
            return interactionCreate_1.UtilsMsg.createMessage({ text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: "DarkRed" });
        });
    }
    Player.remove = remove;
    function seek(message, seek) {
        const { client, guild, author } = message;
        const { song, play, player } = client.queue.get(guild.id);
        const { title, color } = song;
        if (!player.hasSkipped)
            return interactionCreate_1.UtilsMsg.createMessage({ text: `${author}, ⚠ Музыка еще не играет!`, message, color: "DarkRed" });
        play(seek);
        return interactionCreate_1.UtilsMsg.createMessage({ text: `⏭️ | Seeking to [${DurationUtils_1.DurationUtils.ParsingTimeToString(seek)}] song | ${title}`, message, codeBlock: "css", color });
    }
    Player.seek = seek;
    function skip(message, args) {
        if (args)
            return skipSong(message, args);
        return skipSong(message);
    }
    Player.skip = skip;
    function replay(message) {
        const { client, guild } = message;
        const { song, play } = client.queue.get(guild.id);
        const { title, color } = song;
        play();
        return interactionCreate_1.UtilsMsg.createMessage({ text: `🔂 | Replay | ${title}`, message, color, codeBlock: "css" });
    }
    Player.replay = replay;
    function filter(message) {
        const { client, guild } = message;
        const { player, play } = client.queue.get(guild.id);
        const seek = player.streamDuration;
        return play(seek);
    }
    Player.filter = filter;
    function toStop(message) {
        const { client, guild } = message;
        const { player } = client.queue.get(guild.id);
        if (player.hasSkipped)
            player.stop();
    }
    Player.toStop = toStop;
})(Player = exports.Player || (exports.Player = {}));
function skipSong(message, args = 1) {
    const { client, guild, member, author } = message;
    const queue = client.queue.get(guild.id);
    const { song, player, songs, options } = queue;
    const { title, color, requester, url } = songs[args - 1];
    setImmediate(() => {
        const voiceConnection = _VoiceManager_1.Voice.Members(guild);
        const UserToVoice = !!voiceConnection.find((v) => v.id === song.requester.id);
        if (!player.hasSkipped)
            return interactionCreate_1.UtilsMsg.createMessage({ text: `${author}, ⚠ Музыка еще не играет!`, message, color: "DarkRed" });
        if (args > songs.length)
            return interactionCreate_1.UtilsMsg.createMessage({ text: `${author}, В очереди ${songs.length}!`, message, color: "DarkRed" });
        if (member.permissions.has("Administrator") || author.id === requester.id || !UserToVoice) {
            if (args > 1) {
                if (options.loop === "songs")
                    for (let i = 0; i < args - 2; i++)
                        songs.push(songs.shift());
                else
                    queue.songs = songs.slice(args - 2);
                interactionCreate_1.UtilsMsg.createMessage({ text: `⏭️ | Skip to song [${args}] | ${title}`, message, codeBlock: "css", color });
            }
            else {
                interactionCreate_1.UtilsMsg.createMessage({ text: `⏭️ | Skip song | ${title}`, message, codeBlock: "css", color });
            }
            return Player.toStop(message);
        }
        return interactionCreate_1.UtilsMsg.createMessage({ text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: "DarkRed" });
    });
}
