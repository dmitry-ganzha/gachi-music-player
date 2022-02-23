import {Queue} from "./Structures/Queue";
import {Song} from "./Structures/Song";
import {InputTrack, wMessage} from "../../../../../Core/Utils/TypesHelper";
import {VoiceChannel} from "discord.js";
import {VoiceManager} from "../Voice/Voice";
import {audioPlayer} from "../../Audio/AudioPlayer";

export class CreateQueue {
    /**
     * @description Выбираем что сделать создать базу для сервера или добавить в базу музыку
     * @param message {wMessage} Сообщение с сервера
     * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
     * @param track {any} Сама музыка
     */
    public _ = async (message: wMessage, VoiceChannel: VoiceChannel, track: InputTrack): Promise<boolean | void> => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        const song: Song = await new Song(track, message);

        if (!queue) return this.CreateQueueGuild(message, VoiceChannel, song);
        return this.PushSong(message, song);
    };
    /**
     * @description Создаем очередь для сервера
     * @param message {wMessage} Сообщение с сервера
     * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
     * @param song {Song} Сам трек
     */
    protected CreateQueueGuild = async (message: wMessage, VoiceChannel: VoiceChannel, song: Song): Promise<boolean | void> => {
        const {client, guild} = message;

        client.console(`[GuildQueue]: [Create]: [${guild.id}]`);
        client.queue.set(guild.id, new Queue(message, VoiceChannel));

        const queue = client.queue.get(message.guild.id);

        await this.PushSong(message, song, false);
        new VoiceManager().Join(VoiceChannel).subscribe(queue.player as any);
        return audioPlayer.playStream(message);
    };
    /**
     * @description Добавляем музыку в базу сервера и отправляем что было добавлено
     * @param message {wMessage} Сообщение с сервера
     * @param song {Song} Сам трек
     * @param sendMessage {boolean} Отправить сообщение?
     */
    protected PushSong = async ({client, guild}: wMessage, song: Song, sendMessage: boolean = true): Promise<void> => {
        const {songs, events, channels}: Queue = client.queue.get(guild.id);
        void songs.push(song);
        if (sendMessage) void events.message.emit("push", channels.message, song);
        return;
    };
}