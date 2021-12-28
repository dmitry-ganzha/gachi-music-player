import {Queue} from "./Constructors/Queue";
import {Song} from "./Constructors/Song";
import {InputTrack, W_Message} from "../../../../../Core/Utils/W_Message";
import {VoiceChannel} from "discord.js";
import {VoiceManager} from "../Voice/Voice";

export class CreateQueue {
    /**
     * @description Выбираем что сделать создать базу для сервера или добавить в базу музыку
     * @param message {W_Message} Сообщение с сервера
     * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
     * @param track {any} Сама музыка
     */
    public _ = async (message: W_Message, VoiceChannel: VoiceChannel, track: InputTrack): Promise<void | NodeJS.Timeout> => {
        let queue: Queue = message.client.queue.get(message.guild.id);
        let song: Song = new Song(track, message);

        return !queue ? this.ConstQueueGuild(message, VoiceChannel, song) : this.PushSong(message, song);
    }
    /**
     * @description
     * @param message {W_Message} Сообщение с сервера
     * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
     * @param song {Song} Сам трек
     */
    private ConstQueueGuild = async (message: W_Message, VoiceChannel: VoiceChannel, song: Song): Promise<void> => {
        message.client.console(`[GuildQueue]: [Create]: [${message.guild.id}]`);

        message.client.queue.set(message.guild.id, new Queue(message, VoiceChannel));
        await this.PushSong(message, song, false);
        new VoiceManager().Join(VoiceChannel);
        return message.client.queue.get(message.guild.id).player.playStream(message);
    }
    /**
     * @description Добавляем музыку в базу сервера и отправляем что было добавлено
     * @param message {W_Message} Сообщение с сервера
     * @param song {Song} Сам трек
     * @param sendMessage {boolean} Отправить сообщение?
     */
    private PushSong = async (message: W_Message, song: Song, sendMessage: boolean = true): Promise<NodeJS.Timeout> => {
        let {songs, events, channels}: Queue = message.client.queue.get(message.guild.id);
        songs.push(song);
        return setTimeout(async () => sendMessage ? events.message.emit("push", channels.message, song) : null, 230);
    }
}