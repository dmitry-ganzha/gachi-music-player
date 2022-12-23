import {ClientMessage, messageUtils} from "@Client/interactionCreate";
import {StatusPlayerHasSkipped} from "@Structures/AudioPlayer";
import {DurationUtils} from "@Managers/DurationUtils";
import {VoiceState} from "discord.js";
import {Voice} from "@VoiceManager";
import {Queue} from "@Queue/Queue";
import {Song} from "@Queue/Song";

const ParsingTimeToString = DurationUtils.ParsingTimeToString;

//Здесь все функции для взаимодействия с плеером
export namespace PlayerController {
    /**
     * @description Продолжает воспроизведение музыки
     * @param message {ClientMessage} Сообщение с сервера
     */
    export function toResume(message: ClientMessage): void {
        const {client, guild} = message;
        const {player, song}: Queue = client.queue.get(guild.id);
        const {title, color}: Song = song;

        //Продолжаем воспроизведение музыки если она на паузе
        player.resume();
        return messageUtils.sendMessage({text: `▶️ | Resume song | ${title}`, message, codeBlock: "css", color});
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Приостанавливает воспроизведение музыки
     * @param message {ClientMessage} Сообщение с сервера
     */
    export function toPause(message: ClientMessage): void {
        const {client, guild} = message;
        const {player, song}: Queue = client.queue.get(guild.id);
        const {title, color}: Song = song;

        //Приостанавливаем музыку если она играет
        player.pause();
        return messageUtils.sendMessage({text: `⏸ | Pause song | ${title}`, message, codeBlock: "css", color});
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
        const {player, songs, song}: Queue = client.queue.get(guild.id);
        const {title, color, requester, url}: Song = songs[args - 1];

        setImmediate(() => {
            const voiceConnection: VoiceState[] = Voice.Members(guild) as VoiceState[];
            const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === song.requester.id);

            //Если музыку нельзя пропустить из-за плеера
            if (!StatusPlayerHasSkipped.has(player.state.status)) return messageUtils.sendMessage({
                text: `${author}, ⚠ Музыка еще не играет!`, message,
                color: "DarkRed"
            });

            //Если пользователю позволено убрать из очереди этот трек
            if (member.permissions.has("Administrator") || author.id === requester.id || !UserToVoice) {
                if (args === 1) toStop(message);
                songs.splice(args - 1, 1);

                return messageUtils.sendMessage({text: `⏭️ | Remove song | ${title}`, message, codeBlock: "css", color});
            }

            //Если пользователю нельзя это сделать
            return messageUtils.sendMessage({ text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: "DarkRed" });
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
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);
        const {title, color}: Song = queue.song;

        queue.play(seek);
        //Отправляем сообщение о пропуске времени
        return messageUtils.sendMessage({ text: `⏭️ | Seeking to [${ParsingTimeToString(seek)}] song | ${title}`, message, codeBlock: "css", color });
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
        const {player, song}: Queue = client.queue.get(guild.id);
        const {title, color, requester, url}: Song = song;

        setImmediate(() => {
            const voiceConnection: VoiceState[] = Voice.Members(guild) as VoiceState[];
            const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === requester.id);

            //Если музыку нельзя пропустить из-за плеера
            if (!StatusPlayerHasSkipped.has(player.state.status)) return messageUtils.sendMessage({
                text: `${author}, ⚠ Музыка еще не играет!`, message,
                color: "DarkRed"
            });

            //Если пользователю позволено пропустить музыку
            if (member.permissions.has("Administrator") || author.id === requester.id || !UserToVoice) {
                if (StatusPlayerHasSkipped.has(player.state.status)) {
                    messageUtils.sendMessage({text: `⏭️ | Skip song | ${title}`, message, codeBlock: "css", color});
                    return toStop(message);
                }
            }

            //Если пользователю нельзя это сделать
            return messageUtils.sendMessage({ text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: "DarkRed" });
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Повтор текущей музыки
     * @param message {ClientMessage} Сообщение с сервера
     */
    export function toReplay(message: ClientMessage): void {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);
        const {title, color}: Song = queue.song;

        queue.play();
        //Сообщаем о том что музыка начата с начала
        return messageUtils.sendMessage({text: `🔂 | Replay | ${title}`, message, color, codeBlock: "css"});
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Применяем фильтры для плеера
     * @param message {ClientMessage} Сообщение с сервера
     */
    export function toFilter(message: ClientMessage): void {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);
        const player = queue.player;
        const seek: number = player.streamDuration;

        return queue.play(seek);
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Завершает текущую музыку
     * @param message {ClientMessage} Сообщение с сервера
     */
    export function toStop(message: ClientMessage): void {
        const {client, guild} = message;
        const {player}: Queue = client.queue.get(guild.id);

        if (StatusPlayerHasSkipped.has(player.state.status)) player.stop();
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
        const voiceConnection: VoiceState[] = Voice.Members(guild) as VoiceState[];
        const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === queue.song.requester.id);

        //Если музыку нельзя пропустить из-за плеера
        if (!StatusPlayerHasSkipped.has(queue.player.state.status)) return messageUtils.sendMessage({
            text: `${author}, ⚠ Музыка еще не играет!`, message,
            color: "DarkRed"
        });

        //Если пользователь укажет больше чем есть в очереди
        if (args > queue.songs.length) return messageUtils.sendMessage({
            text: `${author}, В очереди ${queue.songs.length}!`, message,
            color: "DarkRed"
        });

        //Если пользователю позволено пропустить музыку
        if (member.permissions.has("Administrator") || author.id === requester.id || !UserToVoice) {
            if (queue.options.loop === "songs") for (let i = 0; i < args - 2; i++) queue.songs.push(queue.songs.shift());
            else queue.songs = queue.songs.slice(args - 2);

            messageUtils.sendMessage({text: `⏭️ | Skip to song [${args}] | ${title}`, message, codeBlock: "css", color});
            return PlayerController.toStop(message);
        }

        //Если пользователю нельзя это сделать
        return messageUtils.sendMessage({ text: `${author}, Ты не включал эту музыку [${title}](${url})`, message, color: "DarkRed" });
    });
}