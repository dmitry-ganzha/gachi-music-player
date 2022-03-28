import {ParserTimeSong} from "../Manager/Functions/ParserTimeSong";
import {Queue} from "../Manager/Queue/Structures/Queue";
import {Song} from "../Manager/Queue/Structures/Song";
import {wMessage} from "../../../../Core/Utils/TypesHelper";
import {VoiceState} from "discord.js";
import {StatusPlayerHasSkipped} from "./AudioPlayer";

export const Controller = {PlayerFilter, PlayerRemove, PlayerPause, PlayerReplay, PlayerResume, PlayerSeek, PlayerSkip};

/**
 * @description Продолжает воспроизведение музыки
 * @param message {wMessage} Сообщение с сервера
 */
async function PlayerResume (message: wMessage): Promise<void> {
    const {client, guild, author} = message;
    const {player, songs}: Queue = client.queue.get(guild.id);
    const {duration, title, color}: Song = songs[0];

    if (player.state.status === 'paused') {
        player.unpause();
        return client.Send({text: `▶️ | [${duration.StringTime}] | Resume song | ${title}`, message: message, type: 'css', color});
    }
    return client.Send({text: `${author}, Текущий статус плеера [\`\`${player.state.status}\`\`\`]`, message: message, color: 'RED'});
}
//====================== ====================== ====================== ======================

/**
 * @description Приостанавливает воспроизведение музыки
 * @param message {wMessage} Сообщение с сервера
 */
async function PlayerPause(message: wMessage): Promise<void> {
    const {client, guild, author} = message;
    const {player, songs}: Queue = client.queue.get(guild.id);
    const {duration, title, color}: Song = songs[0];

    if (player.state.status === 'playing') {
        player.pause(true);
        return client.Send({text: `⏸ | [${duration.StringTime}] | Pause song | ${title}`, message: message, type: 'css', color});
    }
    return client.Send({text: `${author}, Текущий статус плеера [\`\`${player.state.status}\`\`\`]`, message: message, color: 'RED'});
}
//====================== ====================== ====================== ======================

/**
 * @description Завершает текущую музыку
 * @param message {wMessage} Сообщение с сервера
 */
async function PlayerEnd(message: wMessage): Promise<void> {
    const {client, guild} = message;
    const {player, channels}: Queue = client.queue.get(guild.id);

    if (StatusPlayerHasSkipped.has(player.state.status)) {
        if (!channels.connection.isMute) channels.connection.setMute = true;

        setTimeout(() => player.stop(true), 300);
    }
    return;
}
//====================== ====================== ====================== ======================

/**
 * @description Убираем музыку из очереди
 * @param message {wMessage} Сообщение с сервера
 * @param args {string} Аргументы Пример: команда аргумент1 аргумент2
 */
async function PlayerRemove(message: wMessage, args: number): Promise<boolean | void> {
    const {client, guild, member, author} = message;
    const {player, songs}: Queue = client.queue.get(guild.id);
    const {duration, title, color, requester, url}: Song = songs[args - 1];
    const voiceConnection: VoiceState[] = client.connections(guild);
    const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === songs[0].requester.id);

    if (!StatusPlayerHasSkipped.has(player.state.status)) return client.Send({text: `${author}, ⚠ Музыка еще не играет. Текущий статус плеера - [${player.state.status}]`, message, color: 'RED'});

    if (songs.length <= 1) return PlayerEnd(message);

    if (member.permissions.has('Administrator') || author.id === requester.id || !UserToVoice) {
        songs.splice(args - 1, 1);
        if (args === 1) await PlayerEnd(message);
        return client.Send({text: `⏭️ | [${duration.StringTime}] | Remove song | ${title}`, message, type: 'css', color});
    }
    return client.Send({text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: 'RED'});
}
//====================== ====================== ====================== ======================

/**
 * @description Завершает текущую музыку
 * @param message {wMessage} Сообщение с сервера
 * @param seek {number} музыка будет играть с нужной секунды (не работает без ffmpeg)
 */
async function PlayerSeek(message: wMessage, seek: number): Promise<NodeJS.Immediate | void | NodeJS.Timeout> {
    const {client, guild, author} = message;
    const {player, songs, channels}: Queue = client.queue.get(guild.id);
    const {title, color}: Song = songs[0];

    try {
        if (!channels.connection.isMute) channels.connection.setMute = true;

        await client.Send({text: `⏭️ | Seeking to [${ParserTimeSong(seek)}] song | ${title}`, message, type: 'css', color});
        return setTimeout(() => player.seek(message, seek), 500);
    } catch {
        return client.Send({text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: 'RED'});
    }
}
//====================== ====================== ====================== ======================

/**
 * @description Пропускает текущую музыку
 * @param message {wMessage} Сообщение с сервера
 * @param args {number} Сколько треков пропускаем
 */
async function PlayerSkip(message: wMessage, args: number): Promise<void | boolean> {
    if (args) return PlayerSkipTo(message, args);

    const {client, guild, member, author} = message;
    const {songs, player}: Queue = client.queue.get(guild.id);
    const {duration, title, color, requester, url}: Song = songs[0];
    const voiceConnection: VoiceState[] = client.connections(guild);
    const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === requester.id);

    if (!StatusPlayerHasSkipped.has(player.state.status)) return client.Send({text: `${author}, ⚠ Музыка еще не играет. Текущий статус плеера - [${player.state.status}]`, message, color: 'RED'});

    if (member.permissions.has('Administrator') || author.id === requester.id || !UserToVoice) {
        if (StatusPlayerHasSkipped.has(player.state.status)) {
            await client.Send({text: `⏭️ | [${duration.StringTime}] | Skip song | ${title}`, message, type: 'css', color});
            return PlayerEnd(message);
        }
    }
    return client.Send({text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: 'RED'});
}
//====================== ====================== ====================== ======================

/**
 * @description Пропускает музыку под номером
 * @param message {wMessage} Сообщение с сервера
 * @param args {string} Аргументы Пример: команда аргумент1 аргумент2
 */
async function PlayerSkipTo(message: wMessage, args: number): Promise<void | boolean> {
    const {client, guild, member, author} = message;
    const queue: Queue = client.queue.get(guild.id);
    const {duration, title, color, requester, url}: Song = queue.songs[args - 1];
    const voiceConnection: VoiceState[] = client.connections(guild);
    const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === queue.songs[0].requester.id);

    if (!StatusPlayerHasSkipped.has(queue.player.state.status)) return client.Send({text: `${author}, ⚠ Музыка еще не играет. Текущий статус плеера - [${queue.player.state.status}]`, message, color: 'RED'});

    if (args > queue.songs.length) return client.Send({text: `${author}, В очереди ${queue.songs.length}!`, message, color: 'RED'});

    if (member.permissions.has('Administrator') || author.id === requester.id || !UserToVoice) {
        if (queue.options.loop === "songs") for (let i = 0; i < args - 2; i++) queue.songs.push(queue.songs.shift());
        else queue.songs = queue.songs.slice(args - 2);

        await client.Send({text: `⏭️ | [${duration.StringTime}] | Skip to song [${args}] | ${title}`, message, type: 'css', color});
        return PlayerEnd(message);
    }
    return client.Send({text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: 'RED'});
}
//====================== ====================== ====================== ======================

/**
 * @description Повтор текущей музыки
 * @param message {wMessage} Сообщение с сервера
 */
async function PlayerReplay(message: wMessage): Promise<NodeJS.Immediate | void | NodeJS.Timeout> {
    const {client, guild, author} = message;
    const {player, songs, channels}: Queue = client.queue.get(guild.id);
    const {title, color, duration}: Song = songs[0];

    try {
        if (!channels.connection.isMute) channels.connection.setMute = true;

        await client.Send({text: `🔂 | [${duration.StringTime}] | Replay | ${title}`, message, color, type: "css"});
        return setTimeout(() => player.seek(message, 0), 500);
    } catch {
        return client.Send({text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: 'RED'});
    }
}
//====================== ====================== ====================== ======================

/**
 * @description Применяем фильтры для плеера
 * @param message {wMessage} Сообщение с сервера
 */
async function PlayerFilter(message: wMessage): Promise<NodeJS.Immediate | void | NodeJS.Timeout> {
    const {client, guild, author} = message;
    const {player, channels}: Queue = client.queue.get(guild.id);
    const seek: number = player.state.resource?.playbackDuration ? parseInt((player.state.resource?.playbackDuration / 1000).toFixed(0)) : 0;

    try {
        if (!channels.connection.isMute) channels.connection.setMute = true;

        return setTimeout(() => player.seek(message, seek), 500);
    } catch {
        return client.Send({text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: 'RED'});
    }
}