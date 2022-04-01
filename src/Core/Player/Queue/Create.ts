import {ClientMessage} from "../../Client";
import {InputTrack} from "../../Utils/TypeHelper";
import {Queue} from "./Structures/Queue";
import {Song} from "./Structures/Song";
import {JoinVoiceChannel} from "../Voice/VoiceManager";
import {RunPlayer} from "../Audio/AudioPlayer";
import {PushSongMessage} from "../Message/MessageEmitter";
import {VoiceChannel} from "discord.js";

/**
 * @description Выбираем что сделать создать базу для сервера или добавить в базу музыку
 * @param message {ClientMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
 * @param track {any} Сама музыка
 */
export function CreateQueue(message: ClientMessage, VoiceChannel: VoiceChannel, track: InputTrack): Promise<boolean | void | ClientMessage> | void {
    const queue: Queue = message.client.queue.get(message.guild.id);
    const song: Song = new Song(track, message);

    if (!queue) return CreateQueueGuild(message, VoiceChannel, song);
    return PushSong(queue, song);
}
/**
 * @description Создаем очередь для сервера
 * @param message {ClientMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
 * @param song {Song} Сам трек
 */
function CreateQueueGuild(message: ClientMessage, VoiceChannel: VoiceChannel, song: Song): Promise<boolean | void> {
    const {client, guild} = message;

    client.console(`[${guild.id}]: [Queue]: [Method: Set]`);
    client.queue.set(guild.id, new Queue(message, VoiceChannel));

    const queue = client.queue.get(message.guild.id);

    PushSong(queue, song, false);

    const connection = new JoinVoiceChannel(VoiceChannel);
    connection.subscribe = queue.player;
    queue.channels.connection = connection;

    return RunPlayer.playStream(message);
}
/**
 * @description Добавляем музыку в базу сервера и отправляем что было добавлено
 * @param queue {Queue} Очередь с сервера
 * @param song {Song} Сам трек
 * @param sendMessage {boolean} Отправить сообщение?
 */
export function PushSong(queue: Queue, song: Song, sendMessage: boolean = true): Promise<void | ClientMessage> | void {
    queue.songs.push(song);
    if (sendMessage) return PushSongMessage(queue.channels.message, song);
    return;
}