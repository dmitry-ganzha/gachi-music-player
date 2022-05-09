import {ClientMessage} from "../../Client";
import {InputTrack} from "../../Utils/TypeHelper";
import {Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {JoinVoiceChannel} from "../Voice/VoiceManager";
import {PushSongMessage} from "../Manager/Message";
import {VoiceChannel} from "discord.js";

//====================== ====================== ====================== ======================
/**
 * @description Выбираем что сделать создать базу для сервера или добавить в базу музыку
 * @param message {ClientMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
 * @param track {any} Сама музыка
 */
export function CreateQueue(message: ClientMessage, VoiceChannel: VoiceChannel, track: InputTrack): boolean | void | Promise<void | ClientMessage | NodeJS.Timeout> {
    const queue: Queue = message.client.queue.get(message.guild.id);
    const song: Song = new Song(track, message);

    if (!queue) return CreateQueueGuild(message, VoiceChannel, song);
    return PushSong(queue, song);
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем очередь для сервера
 * @param message {ClientMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
 * @param song {Song} Сам трек
 */
function CreateQueueGuild(message: ClientMessage, VoiceChannel: VoiceChannel, song: Song): void {
    const {client, guild} = message;
    client.console(`[Queue]: [GuildID: ${guild.id}, Status: Create]`);

    const GuildQueue = new Queue(message, VoiceChannel);
    const connection = JoinVoiceChannel(VoiceChannel);
    client.queue.set(guild.id, GuildQueue);
    const queue = client.queue.get(message.guild.id);

    PushSong(queue, song, false);

    queue.player.subscribe(connection);
    queue.channels.connection = connection;

    return queue.player.PlayCallback(message);
}
//====================== ====================== ====================== ======================
/**
 * @description Добавляем музыку в базу сервера и отправляем что было добавлено
 * @param queue {Queue} Очередь с сервера
 * @param song {Song} Сам трек
 * @param sendMessage {boolean} Отправить сообщение?
 */
export function PushSong(queue: Queue, song: Song, sendMessage: boolean = true): void {
    queue.songs.push(song);
    if (sendMessage) PushSongMessage(queue.channels.message, song);
}