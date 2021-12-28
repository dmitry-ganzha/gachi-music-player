import {ParserTimeSong} from "../Manager/Functions/ParserTimeSong";
import {Queue} from "../Manager/Queue/Constructors/Queue";
import {Song} from "../Manager/Queue/Constructors/Song";
import {W_Message} from "../../../../Core/Utils/W_Message";
import {VoiceState} from "discord.js";

const StatusPlayerIsSkipped: Set<string> = new Set(['playing', 'paused', 'buffering']); //Статусы плеера для пропуска музыки

/**
 * @class ControlAudioPlayer
 * @augments {resume,pause,end,seek,skip,skipTo,replay,bass,speed}
 * @description Управление музыкой
 * @author SNIPPIK
 */
export class ControlAudioPlayer {
    /**
     * @description Продолжает воспроизведение музыки
     * @param message {W_Message} Сообщение с сервера
     */
    public resume = async (message: W_Message): Promise<any> => new Promise(async (res) => {
        const {player, songs}: Queue = message.client.queue.get(message.guild.id);
        const {duration, title, color}: Song = songs[0];

        if (player.state.status === 'paused') {
            player.unpause();
            return res(message.client.Send({text: `▶️ | [${duration.StringTime}] | Resume song [${title}]`, message: message, type: 'css', color: color}));
        }
        return res(message.client.Send({text: `${message.author}, Текущий статус плеера [${player.state.status}]!`, message: message, color: 'RED'}));
    });

    /**
     * @description Приостанавливает воспроизведение музыки
     * @param message {W_Message} Сообщение с сервера
     */
    public pause = async (message: W_Message): Promise<any> => new Promise(async (res) => {
        const {player, songs}: Queue = message.client.queue.get(message.guild.id);
        const {duration, title, color}: Song = songs[0];

        if (player.state.status === 'playing') {
            player.pause();
            return res(message.client.Send({text: `⏸ | [${duration.StringTime}] | Pause song [${title}]`, message: message, type: 'css', color: color}));
        }
        return res(message.client.Send({text: `${message.author}, Текущий статус плеера [${player.state.status}]!`, message: message, color: 'RED'}));
    });

    /**
     * @description Завершает текущую музыку
     * @param message {W_Message} Сообщение с сервера
     */
    public end = async (message: W_Message): Promise<any> => new Promise(async (res) => {
        const {player}: Queue = message.client.queue.get(message.guild.id);

        if (StatusPlayerIsSkipped.has(player.state.status)) {
            player.stop();
            return res(player.unpause());
        }
        return res(null);
    });

    /**
     * @description Убираем музыку из очереди
     * @param message {W_Message} Сообщение с сервера
     * @param args {string} Аргументы Пример: команда аргумент1 аргумент2
     */
    public remove = async (message: W_Message, args: number): Promise<any> => new Promise(async (res) => {
        const {player, songs, events}: Queue = message.client.queue.get(message.guild.id);
        const {requester, duration, title, url, color}: Song = songs[args[0] - 1];
        const voiceConnection: VoiceState[] = message.client.connections(message.guild);
        const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === songs[0].requester.id);

        if (songs.length <= 1) return player.stop();

        await (async () => events.message.emit('update', message));
        if (message.member.permissions.has('ADMINISTRATOR') || message.author.id === requester.id || !UserToVoice) {
            songs.splice(args[0] - 1, 1);
            if (parseInt(args[0]) === 1) await this.end(message);
            return res(message.client.Send({text: `⏭️ | [${duration.StringTime}] | Remove song [${title}]`, message: message, type: 'css', color: color}));
        }
        return res(message.client.Send({text: `${message.author}, Ты не включал эту музыку [${title}](${url})`, message: message, color: 'RED'}));
    });

    /**
     * @description Завершает текущую музыку
     * @param message {W_Message} Сообщение с сервера
     * @param seek {number} музыка будет играть с нужной секунды (не работает без ffmpeg)
     */
    public seek = async (message: W_Message, seek: number): Promise<any> => new Promise(async (res) => {
        const {player, songs}: Queue = message.client.queue.get(message.guild.id);
        const {title, color}: Song = songs[0];
        try {
            await message.client.Send({text: `⏭️ | Seeking to [${ParserTimeSong(seek)}] song [${title}]`, message: message, type: 'css', color: color});
            return res(player.seek(message, seek));
        } catch (e) {
            message.client.console(e);
            return res(message.client.Send({text: `${message.author}, Произошла ошибка... Попробуй еще раз!`, message: message, color: 'RED'}));
        }
    });

    /**
     * @description Пропускает текущую музыку
     * @param message {W_Message} Сообщение с сервера
     * @param args {number} Сколько треков скипаем
     */
    public skip = async (message: W_Message, args: number): Promise<any> => new Promise(async (res) => {
        if (args) return res(this.skipTo(message, args))
        const {songs, player}: Queue = message.client.queue.get(message.guild.id);
        const {duration, title, url, color, requester}: Song = songs[0];
        const voiceConnection: VoiceState[] = message.client.connections(message.guild);
        const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === requester.id);

        if (message.member.permissions.has('ADMINISTRATOR') || message.author.id === requester.id || !UserToVoice) {
            if (player.state.status === 'buffering') return res(message.client.Send({text: `${message.author}, ⚠ Музыка еще не играет.`, message: message, color: 'RED'}));
            if (StatusPlayerIsSkipped.has(player.state.status)) {
                await this.end(message);
                return res(message.client.Send({text: `⏭️ | [${duration.StringTime}] | Skip song [${title}]`, message: message, type: 'css', color: color}));
            }
        }
        return res(message.client.Send({text: `${message.author}, Ты не включал эту музыку [${title}](${url})`, message: message, color: 'RED'}));
    });

    /**
     * @description Пропускает музыку под номером
     * @param message {W_Message} Сообщение с сервера
     * @param args {string} Аргументы Пример: команда аргумент1 аргумент2
     */
    public skipTo = async (message: W_Message, args: number): Promise<any> => new Promise(async (res) => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        const {duration, title, url, color, requester}: Song = queue.songs[args[0] - 1];
        const voiceConnection: VoiceState[] = message.client.connections(message.guild);
        const UserToVoice: boolean = !!voiceConnection.find((v: VoiceState) => v.id === queue.songs[0].requester.id);

        if (args[0] > queue.songs.length) throw res(message.client.Send({text: `${message.author}, В очереди ${queue.songs.length}!`, message: message, color: 'RED'}));

        if (message.member.permissions.has('ADMINISTRATOR') || message.author.id === requester.id || !UserToVoice) {
            if (queue.options.loop === "songs") for (let i = 0; i < args[0] - 2; i++) queue.songs.push(queue.songs.shift());
            else queue.songs = queue.songs.slice(args[0] - 2);

            await this.end(message);
            return res(message.client.Send({text: `⏭️ | [${duration.StringTime}] | Skip to song [${args[0]}]  [${title}]`, message: message, type: 'css', color: color}));
        }
        return res(message.client.Send({text: `${message.author}, Ты не включал эту музыку [${title}](${url})`, message: message, color: 'RED'}));
    });

    /**
     * @description Повтор текущей музыки
     * @param message {W_Message} Сообщение с сервера
     */
    public replay = async (message: W_Message): Promise<any> => new Promise(async (res) => {
        const {player, songs}: Queue = message.client.queue.get(message.guild.id);
        const {title, color, duration}: Song = songs[0];

        try {
            await message.client.Send({text: `🔂 | [${duration.StringTime}] | Replay [${title}]`, message: message, color: color, type: "css"});
            return res(player.seek(message, 0));
        } catch (e) {
            message.client.console(e);
            return res(message.client.Send({text: `${message.author}, Произошла ошибка... Попробуй еще раз!`, message: message, color: 'RED'}));
        }
    });

    /**
     * @description Увеличение громкости басса
     * @param message {W_Message} Сообщение с сервера
     * @param args {number} На сколько увеличиваем басс
     */
    public bass = async (message: W_Message, args: number): Promise<any> => new Promise(async (res) => {
        const {options, player}: Queue = message.client.queue.get(message.guild.id);
        const seek: number = parseInt((player.state.resource.playbackDuration / 1000).toFixed(0));
        options.bass = args >= 10 ? 10 : !args ? 0 : args;

        try {
            if (options.bass && !args) {
                await message.client.Send({text: `#️⃣ | Bass boost: выключен`, message: message, type: "css"});
            } else {
                await message.client.Send({text: `#️⃣ | Bass boost: ${options.bass}`, message: message, type: "css"});
            }
            return res(player.seek(message, seek));
        } catch (e) {
            message.client.console(e);
            return res(message.client.Send({text: `${message.author}, Произошла ошибка... Попробуй еще раз!`, message: message, color: "RED"}));
        }
    });

    /**
     * @description Изменение скорости воспроизведения музыки
     * @param message {W_Message} Сообщение с сервера
     * @param args {number} На сколько ускоряем музыку
     */
    public speed = async (message: W_Message, args: number): Promise<any> => new Promise(async (res) => {
        const {player, options}: Queue = message.client.queue.get(message.guild.id);
        const seek: number = parseInt((player.state.resource.playbackDuration / 1000).toFixed(0));
        options.speed = args >= 3 ? 3 : !args ? 1 : args;

        try {
            if (options.speed  && !args) {
                await message.client.Send({text: `⏭ | Speed player: 1`, message: message, type: "css", color: "GREEN"});
            } else {
                await message.client.Send({text: `⏭ | Speed player: ${options.speed}`, message: message, type: "css", color: "GREEN"});
            }
            return res(player.seek(message, seek));
        } catch (e) {
            message.client.console(e);
            return res(message.client.Send({text: `${message.author}, Произошла ошибка... Попробуй еще раз!`, message: message, color: "RED"}));
        }
    });
}