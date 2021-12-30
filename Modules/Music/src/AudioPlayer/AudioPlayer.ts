import {
    AudioPlayer,
    AudioPlayerError, AudioPlayerState,
    AudioResource,
    createAudioPlayer,
    createAudioResource,
    StreamType
} from "@discordjs/voice";
import {CreateStream} from "./CreateStream";
import {W_Message} from "../../../../Core/Utils/W_Message";
import {VoiceManager} from "../Manager/Voice/Voice";
import {Queue} from "../Manager/Queue/Constructors/Queue";
import cfg from "../../../../db/Config.json";
import {Song} from "../Manager/Queue/Constructors/Song";

// @ts-ignore
export class audioPlayer extends createAudioPlayer {
    [x: string]: any;
    public state: AudioPlayerState & {missedFrames?: number, resource: AudioResource};
    public play: Function;
    constructor(msg: W_Message) {
        super({behaviors: {maxMissedFrames: cfg.Player.MaxSkipFragment || 0}});
        this.on("idle", async () => this.onIdlePlayer(msg));
        //this.on("autopaused", async () => this.onAutoPausePlayer(msg));
        this.on("error", async (err: AudioPlayerError) => this.onErrorPlayer(err, msg));
        this.on("buffering", async () => this.onBufferingPlayer(msg));
        this.setMaxListeners(3);
    };

    /**
     * @description Включаем музыку с пропуском
     * @param message {W_Message} Сообщение с сервера
     * @param seek {number} Пропуск музыки до 00:00:00
     */
    public seek = (message: W_Message, seek: number): Promise<void> => new Promise((res) => {
        //Не выводим стрим из основного потока, иначе будут лаги в музыке
        return res(this.CreateResource(message, seek).then((stream) => this.play(stream)));
    });
    /**
     * @description Включаем музыку
     * @param message {W_Message} Сообщение с сервера
     */
    public playStream = (message: W_Message): Promise<void> => new Promise((res) => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (queue.songs?.length <= 0) return queue.events.queue.emit('DestroyQueue', queue, message);
        message.client.console(`[Playing: ${message.guild.id}]: [${queue.songs[0].type}]: [${queue.songs[0].title}]`);

        queue.events.message.emit('playSong', message); //Async send message
        //Не выводим стрим из основного потока, иначе будут лаги в музыке
        return res(this.CreateResource(message).then((stream) => this.play(stream)));
    });
    /**
     * @description Создаем Opus поток
     * @param message {W_Message} Сообщение с сервера
     * @param seek {number} Пропуск музыки до 00:00:00
     */
    private CreateResource = (message: W_Message, seek: number = 0): Promise<AudioResource<CreateStream>> => new Promise((res) => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        return res(new CreateStream().init(queue.songs[0], queue, seek).then((stream) => createAudioResource(stream, {inputType: StreamType.Opus})));
    });
    /**
     * @description Когда плеер проиграет песню, он возвратит эту функцию
     * @param message {W_Message} Сообщение с сервера
     */
    private onIdlePlayer = async (message: W_Message): Promise<NodeJS.Timeout | void> => new Promise(async (res) => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!queue || queue.songs.length <= 0) return;
        return res(this.playNextSong(message, queue));
    });
    /**
     * @description Когда плеер выдает ошибку, он возвратит эту функцию
     * @param err {AudioPlayerError} Ошибка
     * @param message {W_Message} Сообщение с сервера
     */
    private onErrorPlayer = async (err: AudioPlayerError, message: W_Message): Promise<void> => new Promise(async (res: any) => {
        const {events, songs}: Queue = message.client.queue.get(message.guild.id);

        return res(events.message.emit('warning', message, songs[0], err));
    });
    /**
     * @description Когда плеер получает поток (музыку), он возвратит эту функцию
     * @param message {W_Message} Сообщение с сервера
     */
    private onBufferingPlayer = async (message: W_Message): Promise<void> => {
        const {channels, player}: Queue = message.client.queue.get(message.guild.id);

        if (!channels.connection?.subscribe) (channels.connection = new VoiceManager().Join(channels.voice)).subscribe(player as AudioPlayer);
        return null;
    }
    /**
     * @description Когда плеер сам ставит себя на паузу, возврат этой функции
     * @param message {W_Message} Сообщение с сервера
     */
    /*
    private onAutoPausePlayer = async (message: W_Message): Promise<unknown> => new Promise(async (res) => {
        let queue: Queue = message.client.queue.get(message.guild.id);
        if (!queue || queue.songs.length <= 0) return;
        return res(new VoiceManager().Join(queue.channel.voice).subscribe(queue.player as AudioPlayer));
    });
     */


    /**
     * @description Что будем делать перед включением следующего трека
     * @param message {W_Message} Сообщение с сервера
     * @param queue {Queue} Очередь с сервера
     */
    private playNextSong = async (message: W_Message, queue: Queue): Promise<NodeJS.Timeout | void> => new Promise(async (res) => {
        if (this?.state?.missedFrames) await message.client.Send({text: `[AudioPlayer]: Lost Frames [${this.state.missedFrames}]`, message: message, color: "GREEN" });

        this.isRemoveSong(queue);
        return res(queue.options.random === true ? this.Shuffle(message, queue) : this.playStream(message));
    });
    /**
     * @description Повтор музыки
     * @param queue {Queue} Очередь сервера
     */
    private isRemoveSong = ({options, songs}: Queue): void => {
        if (options.loop === "song") return null;
        else if (options.loop === "songs") {
            let repeat = songs.shift();
            songs.push(repeat);
        } else songs.shift();

        return null;
    };
    /**
     * @description Перетасовка музыки в очереди
     * @param message {W_Message} Сообщение с сервера
     * @param queue {Queue} Очередь сервера
     */
    private Shuffle = async (message: W_Message, {songs}: Queue): Promise<void> => {
        const set: number = Math.floor(Math.random() * songs.length);
        const LocalQueue2: Song = songs[set];

        songs[set] = songs[0];
        songs[0] = LocalQueue2;

        return this.playStream(message);
    };
}