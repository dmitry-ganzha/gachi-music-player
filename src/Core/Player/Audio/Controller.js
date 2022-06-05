"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Controller = void 0;
const AudioPlayer_1 = require("./AudioPlayer");
const DurationUtils_1 = require("../Manager/DurationUtils");
exports.Controller = { PlayerFilter, PlayerRemove, PlayerPause, PlayerReplay, PlayerResume, PlayerSeek, PlayerSkip };
function PlayerResume(message) {
    const { client, guild, author } = message;
    const { player, songs } = client.queue.get(guild.id);
    const { title, color } = songs[0];
    if (player.state.status === 'paused') {
        player.resume();
        return client.Send({ text: `▶️ | Resume song | ${title}`, message, type: 'css', color });
    }
    return client.Send({ text: `${author}, Текущий статус плеера [\`\`${player.state.status}\`\`\`]`, message, color: 'RED' });
}
function PlayerPause(message) {
    const { client, guild, author } = message;
    const { player, songs } = client.queue.get(guild.id);
    const { title, color } = songs[0];
    if (player.state.status === 'playing') {
        player.pause();
        return client.Send({ text: `⏸ | Pause song | ${title}`, message, type: 'css', color });
    }
    return client.Send({ text: `${author}, Текущий статус плеера [\`\`${player.state.status}\`\`\`]`, message, color: 'RED' });
}
function PlayerEnd(message) {
    const { client, guild } = message;
    const { player } = client.queue.get(guild.id);
    if (AudioPlayer_1.StatusPlayerHasSkipped.has(player.state.status)) {
        setTimeout(player.stop, 300);
    }
    return;
}
function PlayerRemove(message, args) {
    const { client, guild, member, author } = message;
    const { player, songs } = client.queue.get(guild.id);
    const { title, color, requester, url } = songs[args - 1];
    const voiceConnection = client.connections(guild);
    const UserToVoice = !!voiceConnection.find((v) => v.id === songs[0].requester.id);
    if (!AudioPlayer_1.StatusPlayerHasSkipped.has(player.state.status))
        return client.Send({ text: `${author}, ⚠ Музыка еще не играет. Текущий статус плеера - [${player.state.status}]`, message, color: 'RED' });
    if (songs.length <= 1)
        return PlayerEnd(message);
    if (member.permissions.has('Administrator') || author.id === requester.id || !UserToVoice) {
        songs.splice(args - 1, 1);
        if (args === 1)
            PlayerEnd(message);
        return client.Send({ text: `⏭️ | Remove song | ${title}`, message, type: 'css', color });
    }
    return client.Send({ text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: 'RED' });
}
function PlayerSeek(message, seek) {
    const { client, guild, author } = message;
    const { player, songs } = client.queue.get(guild.id);
    const { title, color } = songs[0];
    try {
        client.Send({ text: `⏭️ | Seeking to [${(0, DurationUtils_1.ParseTimeString)(seek)}] song | ${title}`, message, type: 'css', color });
        return player.seek(message, seek);
    }
    catch {
        return client.Send({ text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: 'RED' });
    }
}
function PlayerSkip(message, args) {
    if (args)
        return PlayerSkipTo(message, args);
    const { client, guild, member, author } = message;
    const { songs, player } = client.queue.get(guild.id);
    const { title, color, requester, url } = songs[0];
    const voiceConnection = client.connections(guild);
    const UserToVoice = !!voiceConnection.find((v) => v.id === requester.id);
    if (!AudioPlayer_1.StatusPlayerHasSkipped.has(player.state.status))
        return client.Send({ text: `${author}, ⚠ Музыка еще не играет. Текущий статус плеера - [${player.state.status}]`, message, color: 'RED' });
    if (member.permissions.has('Administrator') || author.id === requester.id || !UserToVoice) {
        if (AudioPlayer_1.StatusPlayerHasSkipped.has(player.state.status)) {
            client.Send({ text: `⏭️ | Skip song | ${title}`, message, type: 'css', color });
            return PlayerEnd(message);
        }
    }
    return client.Send({ text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: 'RED' });
}
function PlayerSkipTo(message, args) {
    const { client, guild, member, author } = message;
    const queue = client.queue.get(guild.id);
    const { title, color, requester, url } = queue.songs[args - 1];
    const voiceConnection = client.connections(guild);
    const UserToVoice = !!voiceConnection.find((v) => v.id === queue.songs[0].requester.id);
    if (!AudioPlayer_1.StatusPlayerHasSkipped.has(queue.player.state.status))
        return client.Send({ text: `${author}, ⚠ Музыка еще не играет. Текущий статус плеера - [${queue.player.state.status}]`, message, color: 'RED' });
    if (args > queue.songs.length)
        return client.Send({ text: `${author}, В очереди ${queue.songs.length}!`, message, color: 'RED' });
    if (member.permissions.has('Administrator') || author.id === requester.id || !UserToVoice) {
        if (queue.options.loop === "songs")
            for (let i = 0; i < args - 2; i++)
                queue.songs.push(queue.songs.shift());
        else
            queue.songs = queue.songs.slice(args - 2);
        client.Send({ text: `⏭️ | Skip to song [${args}] | ${title}`, message, type: 'css', color });
        return PlayerEnd(message);
    }
    return client.Send({ text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: 'RED' });
}
function PlayerReplay(message) {
    const { client, guild, author } = message;
    const { player, songs } = client.queue.get(guild.id);
    const { title, color } = songs[0];
    try {
        client.Send({ text: `🔂 | Replay | ${title}`, message, color, type: "css" });
        return player.seek(message);
    }
    catch {
        return client.Send({ text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: 'RED' });
    }
}
function PlayerFilter(message) {
    const { client, guild, author } = message;
    const { player } = client.queue.get(guild.id);
    const seek = player.CurrentTime;
    try {
        return player.seek(message, seek);
    }
    catch {
        return client.Send({ text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: 'RED' });
    }
}
