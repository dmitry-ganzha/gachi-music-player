import {Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {VoiceState} from "discord.js";
import {StatusPlayerHasSkipped} from "./AudioPlayer";
import {DurationUtils} from "../Manager/DurationUtils";
import {ClientMessage} from "../../Handler/Events/Activity/Message";

const ParsingTimeToString = DurationUtils.ParsingTimeToString;

//Здесь все функции для взаимодействия с плеером
export namespace PlayerController {
    /**
     * @description Продолжает воспроизведение музыки
     * @param message {ClientMessage} Сообщение с сервера
     */
    export function toResume (message: ClientMessage): void {
        const {client, guild, author} = message;
        const {player, songs}: Queue = client.queue.get(guild.id);
        const {title, color}: Song = songs[0];

        if (player.state.status === "paused") {
            player.resume();
            return client.sendMessage({text: `▶️ | Resume song | ${title}`, message, type: "css", color});
        }
        return client.sendMessage({text: `${author}, Текущий статус плеера [${player.state.status}]`, message, color: "RED"});
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Приостанавливает воспроизведение музыки
     * @param message {ClientMessage} Сообщение с сервера
     */
    export function toPause(message: ClientMessage): void {
        const {client, guild, author} = message;
        const {player, songs}: Queue = client.queue.get(guild.id);
        const {title, color}: Song = songs[0];

        if (player.state.status === "playing") {
            player.pause();
            return client.sendMessage({text: `⏸ | Pause song | ${title}`, message, type: "css", color});
        }
        return client.sendMessage({text: `${author}, Текущий статус плеера [${player.state.status}]`, message, color: "RED"});
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Убираем музыку из очереди
     * @param message {ClientMessage} Сообщение с сервера
     * @param args {string} Аргументы Пример: команда аргумент1 аргумент2
     * @requires {toStop}
     */
    export function toRemove(message: ClientMessage, args: number): void {
        const {client, guild, member, author} = message;
        const {player, songs}: Queue = client.queue.get(guild.id);
        const {title, color, requester, url}: Song = songs[args - 1];

        setImmediate(() => {
            const voiceConnection: VoiceState[] = client.connections(guild) as VoiceState[];
            const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === songs[0].requester.id);

            //Если музыка не играет
            if (!StatusPlayerHasSkipped.has(player.state.status)) return client.sendMessage({
                text: `${author}, ⚠ Музыка еще не играет!`,
                message,
                color: "RED"
            });

            //Если всего один трек
            if (songs.length <= 1) return toStop(message);

            //Если пользователю позволено убрать из очереди этот трек
            if (member.permissions.has("Administrator") || author.id === requester.id || !UserToVoice) {
                songs.splice(args - 1, 1);
                if (args === 1) toStop(message);
                return client.sendMessage({text: `⏭️ | Remove song | ${title}`, message, type: "css", color});
            }

            //Если пользователю нельзя это сделать
            return client.sendMessage({text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: "RED"});
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Завершает текущую музыку
     * @param message {ClientMessage} Сообщение с сервера
     * @param seek {number} музыка будет играть с нужной секунды (не работает без ffmpeg)
     * @requires {ParsingTimeToString}
     */
    export function toSeek(message: ClientMessage, seek: number): void {
        const {client, guild, author} = message;
        const queue: Queue = client.queue.get(guild.id);
        const player = queue.player;
        const {title, color}: Song = queue.songs[0];

        try {
            client.sendMessage({text: `⏭️ | Seeking to [${ParsingTimeToString(seek)}] song | ${title}`, message, type: "css", color});
            return player.play(queue, seek);
        } catch {
            return client.sendMessage({text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: "RED"});
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Пропускает текущую музыку
     * @param message {ClientMessage} Сообщение с сервера
     * @param args {number} Сколько треков пропускаем
     * @requires {toSkipNumber, toStop}
     */
    export function toSkip(message: ClientMessage, args: number): void {
        if (args) return toSkipNumber(message, args);

        const {client, guild, member, author} = message;
        const {songs, player}: Queue = client.queue.get(guild.id);
        const {title, color, requester, url}: Song = songs[0];

        setImmediate(() => {
            const voiceConnection: VoiceState[] = client.connections(guild) as VoiceState[];
            const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === requester.id);

            //Если музыка не играет
            if (!StatusPlayerHasSkipped.has(player.state.status)) return client.sendMessage({
                text: `${author}, ⚠ Музыка еще не играет!`,
                message,
                color: "RED"
            });

            //Если пользователю позволено пропустить музыку
            if (member.permissions.has("Administrator") || author.id === requester.id || !UserToVoice) {
                if (StatusPlayerHasSkipped.has(player.state.status)) {
                    client.sendMessage({text: `⏭️ | Skip song | ${title}`, message, type: "css", color});
                    return toStop(message);
                }
            }

            //Если пользователю нельзя это сделать
            return client.sendMessage({text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: "RED"});
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Повтор текущей музыки
     * @param message {ClientMessage} Сообщение с сервера
     */
    export function toReplay(message: ClientMessage): void {
        const {client, guild, author} = message;
        const queue: Queue = client.queue.get(guild.id);
        const player = queue.player;
        const {title, color}: Song = queue.songs[0];

        try {
            client.sendMessage({text: `🔂 | Replay | ${title}`, message, color, type: "css"});
            return player.play(queue);
        } catch {
            return client.sendMessage({text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: "RED"});
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Применяем фильтры для плеера
     * @param message {ClientMessage} Сообщение с сервера
     */
    export function toFilter(message: ClientMessage): void {
        const {client, guild, author} = message;
        const queue: Queue = client.queue.get(guild.id);
        const player = queue.player;
        const seek: number = player.playbackDuration;

        try {
            return player.play(queue, seek);
        } catch {
            return client.sendMessage({text: `${author}, Произошла ошибка... Попробуй еще раз!`, message, color: "RED"});
        }
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Пропускает музыку под номером
 * @param message {ClientMessage} Сообщение с сервера
 * @param args {string} Аргументы Пример: команда аргумент1 аргумент2
 * @requires {toStop}
 */
function toSkipNumber(message: ClientMessage, args: number): void {
    const {client, guild, member, author} = message;
    const queue: Queue = client.queue.get(guild.id);
    const {title, color, requester, url}: Song = queue.songs[args - 1];

    setImmediate(() => {
        const voiceConnection: VoiceState[] = client.connections(guild) as VoiceState[];
        const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === queue.songs[0].requester.id);

        //Если музыка не играет
        if (!StatusPlayerHasSkipped.has(queue.player.state.status)) return client.sendMessage({
            text: `${author}, ⚠ Музыка еще не играет!`,
            message,
            color: "RED"
        });

        //Если пользователь укажет больше чем есть в очереди
        if (args > queue.songs.length) return client.sendMessage({
            text: `${author}, В очереди ${queue.songs.length}!`,
            message,
            color: "RED"
        });

        //Если пользователю позволено пропустить музыку
        if (member.permissions.has("Administrator") || author.id === requester.id || !UserToVoice) {
            if (queue.options.loop === "songs") for (let i = 0; i < args - 2; i++) queue.songs.push(queue.songs.shift());
            else queue.songs = queue.songs.slice(args - 2);

            client.sendMessage({text: `⏭️ | Skip to song [${args}] | ${title}`, message, type: "css", color});
            return toStop(message);
        }

        //Если пользователю нельзя это сделать
        return client.sendMessage({text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: "RED"});
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Завершает текущую музыку
 * @param message {ClientMessage} Сообщение с сервера
 */
function toStop(message: ClientMessage): void {
    const {client, guild} = message;
    const {player}: Queue = client.queue.get(guild.id);

    if (StatusPlayerHasSkipped.has(player.state.status)) setTimeout(player.stop, 300);
}