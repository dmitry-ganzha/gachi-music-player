import {EventEmitter} from "node:events";
import {StageChannel, VoiceChannel} from "discord.js";
import {AudioPlayer, VoiceConnection} from "@discordjs/voice";
import {LoopType, W_Message} from "../../../../../../Core/Utils/W_Message";
import {EventMessage} from "../../../Events/Message/Msg";
import {audioPlayer} from "../../../AudioPlayer/AudioPlayer";
import {VoiceEvents} from "../../../Events/Voice/VoiceDestroyer";
import {Song} from "./Song";
import {VoiceManager} from "../../Voice/Voice";

export class Queue {
    public player: audioPlayer & AudioPlayer | audioPlayer;
    public events: {message: EventMessage, queue: QueueEvents, helper: VoiceEvents};
    public channels: {message: W_Message, voice: VoiceChannel | StageChannel, connection: VoiceConnection};
    public options: {random: boolean, loop: LoopType, stop: boolean, bass: number, speed: number};
    public AutoDisconnect: {state: boolean, timer: NodeJS.Timeout};
    public songs: Song[];

    constructor(message: W_Message, VoiceConnection: VoiceChannel) {
        this.player = new audioPlayer(message);
        this.events = {
            message: new EventMessage(),
            queue: new QueueEvents(),
            helper: new VoiceEvents()
        }
        this.channels = {
            message: message,
            voice: VoiceConnection,
            connection: null
        };
        this.options = {
            random: false,
            loop: "off",
            stop: false,
            bass: 0,
            speed: 0
        };
        this.AutoDisconnect = {
            state: null,
            timer: null
        };

        this.songs = [];
    };
}

class QueueEvents extends EventEmitter {
    constructor() {
        super();
        this.on('DestroyQueue', this.onDestroyQueue);
        this.on('pushSong', this.onPushSong);
        this.setMaxListeners(2);
    };
    /**
     * @description Добавляем музыку в очередь
     * @param song {object}
     * @param message {object}
     */
    private onPushSong = async (song: Song, message: W_Message): Promise<unknown | null> => new Promise(async (res) => {
        let queue: Queue = message.client.queue.get(message.guild.id);
        return res(queue ? queue.songs.push(song) : null);
    });
    /**
     * @description Удаление очереди
     * @param queue {object} Очередь сервера
     * @param message {object} Сообщение с сервера
     * @param sendDelQueue {boolean} Отправить сообщение об удалении очереди
     */
    private onDestroyQueue = async (queue: Queue, message: W_Message, sendDelQueue: boolean = true): Promise<NodeJS.Timeout> => new Promise(async (res) => {
        if (!queue) return;

        await this.DeleteMessage(queue);
        await this.LeaveVoice(queue?.channels?.message?.guild.id);
        await this.DestroyEvents(queue);
        await this.StopPlayer(queue.player);
        if (sendDelQueue) await this.SendChannelToEnd(queue, message);

        return res(this.DeleteQueue(message));
    });
    /**
     * @description Завершаем воспроизведение в player
     * @param player {audioPlayer | AudioPlayer}
     */
    private StopPlayer = async (player: audioPlayer | AudioPlayer): Promise<any> => player ? player.stop() : null;
    /**
     * @description Отключаемся от голосового канала
     * @param GuildID {string} ID сервера
     */
    private LeaveVoice = async (GuildID: string): Promise<void> => new VoiceManager().Disconnect(GuildID);
    /**
     * @description Удаляем сообщение о текущей песне
     * @param channels {Queue["channels"]} Все каналы из очереди
     */
    private DeleteMessage = async ({channels}: Queue): Promise<NodeJS.Timeout> => setTimeout(async () => channels?.message?.delete().catch(() => undefined), 3e3);
    /**
     * @description Отправляем сообщение, что музыка завершена
     * @param options {Queue["options"]} Опции из очереди
     * @param message {W_Message} Сообщение с сервера
     */
    private SendChannelToEnd = async ({options}: Queue, message: W_Message): Promise<any> => {
        if (options.stop) return message.client.Send({text: `🎵 | Музыка была выключена`, message: message, type: 'css'});
        return message.client.Send({text: `🎵 | Музыка закончилась`, message: message, type: 'css'});
    };
    /**
     * @description Удаляем очередь
     * @param message {W_Message} Сообщение с сервера
     */
    private DeleteQueue = async (message: W_Message): Promise<NodeJS.Timeout> => setTimeout(async () => {
        message.client.console(`[GuildQueue]: [Delete]: [${message.guild.id}]`);
        return message.client.queue.delete(message.guild.id);
    }, 75);
    /**
     * @description Удаляем ивенты (не ждем пока Node.js сама со всем справится, память нужна всегда)
     * @param events {Queue["events"]} Ивенты очереди
     * @param player {Queue["player"]} Сам плеер
     */
    private DestroyEvents = async ({events, player}: Queue): Promise<null> => {
        //Destroy Player events
        ["idle", "error", "buffering"].forEach((eventName: string) => player.removeAllListeners(eventName));
        //Destroy Message events
        ["update", "playSong", "warning", "push"].forEach((eventName: string) => events.message.removeAllListeners(eventName));
        //Destroy Voice events
        ["StartTimerDestroyer", "CancelTimerDestroyer"].forEach((eventName: string) => events.helper.removeAllListeners(eventName));
        //Destroy Queue events
        ["DestroyQueue", "pushSong"].forEach((eventName: string) => this.removeAllListeners(eventName));
        return null;
    };
}