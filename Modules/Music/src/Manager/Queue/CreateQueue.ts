import {Queue} from "./Structures/Queue";
import {Song} from "./Structures/Song";
import {InputTrack, wMessage} from "../../../../../Core/Utils/TypesHelper";
import {VoiceChannel} from "discord.js";
import {VoiceManager} from "../Voice/Voice";
import {audioPlayer} from "../../Audio/AudioPlayer";

/**
 * @description Выбираем что сделать создать базу для сервера или добавить в базу музыку
 * @param message {wMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
 * @param track {any} Сама музыка
 */
export async function CreateQueue(message: wMessage, VoiceChannel: VoiceChannel, track: InputTrack): Promise<boolean | void | unknown> {
    const queue: Queue = message.client.queue.get(message.guild.id);
    const song: Song = new Song(track, message);

    if (!queue) return CreateQueueGuild(message, VoiceChannel, song);
    return PushSong(queue, song);
}
/**
 * @description Создаем очередь для сервера
 * @param message {wMessage} Сообщение с сервера
 * @param VoiceChannel {VoiceChannel} Подключение к голосовому каналу
 * @param song {Song} Сам трек
 */
async function CreateQueueGuild(message: wMessage, VoiceChannel: VoiceChannel, song: Song): Promise<boolean | void> {
    const {client, guild} = message;

    client.console(`[GuildQueue]: [Create]: [${guild.id}]`);
    client.queue.set(guild.id, new Queue(message, VoiceChannel));

    const queue = client.queue.get(message.guild.id);

    await PushSong(queue, song, false);
    new VoiceManager().Join(VoiceChannel).subscribe(queue.player as any);
    return audioPlayer.playStream(message);
}
/**
 * @description Добавляем музыку в базу сервера и отправляем что было добавлено
 * @param queue {Queue} Очередь с сервера
 * @param song {Song} Сам трек
 * @param sendMessage {boolean} Отправить сообщение?
 */
export async function PushSong(queue: Queue, song: Song, sendMessage: boolean = true): Promise<void> {
    queue.songs.push(song);
    if (sendMessage) void queue.events.message.emit("push", queue.channels.message, song);
    return;
}