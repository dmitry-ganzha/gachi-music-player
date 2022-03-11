import {
    AudioPlayer,
    AudioPlayerError,
    AudioPlayerState,
    AudioPlayerStatus,
    AudioResource,
    PlayerSubscription
} from "@discordjs/voice";
import {FFmpegStream, FinderResource} from "./Streamer";
import {wMessage} from "../../../../Core/Utils/TypesHelper";
import {VoiceManager} from "../Manager/Voice/Voice";
import {Queue} from "../Manager/Queue/Structures/Queue";
import {Song} from "../Manager/Queue/Structures/Song";
import {Queue_Channels} from "../Events/Queue/QueueEvent";
type PlayerState = AudioPlayerState & {missedFrames?: number, resource?: AudioResource};

/**
 * @description Настраиваем AudioPlayer
 */
export class audioPlayer extends AudioPlayer {
    public set state(newState: PlayerState) { super.state = newState; };
    public get state(): PlayerState { return super.state; };
    protected set playingTime(time: number) { this.state.resource.playbackDuration = time; };

    public constructor(msg: wMessage) {
        super();
        this.on(AudioPlayerStatus.Idle, async (): Promise<any> => onIdlePlayer(msg));
        this.on(AudioPlayerStatus.Buffering, async (): Promise<any> => onBufferingPlayer(msg));
        this.on(AudioPlayerStatus.AutoPaused, async () => onAutoPausePlayer(msg));

        this.on("error", async (err: AudioPlayerError): Promise<any> => onErrorPlayer(err, msg));
        this.setMaxListeners(4);
    };

    /**
     * @description Заменяем оригинальный play на свой
     * @param resource {AudioResource} Поток
     */
    public play = (resource: AudioResource): void => {
        if (!resource) {
            void this.emit('error', 'Error: AudioResource has not found' as any);
            return;
        }
        const onStreamError = (error: Error) => {
            if (this.state.status !== AudioPlayerStatus.Idle) void this.emit('error', new AudioPlayerError(error, this.state.resource));
            if (this.state.status !== AudioPlayerStatus.Idle && this.state.resource === resource) this.state = { status: AudioPlayerStatus.Idle };
        };

        if (resource.started) this.state = { status: AudioPlayerStatus.Playing, missedFrames: 0, playbackDuration: 0, resource, onStreamError };
        else {
            const onReadableCallback = () => {
                if (this.state.status === AudioPlayerStatus.Buffering && this.state.resource === resource)
                    this.state = { status: AudioPlayerStatus.Playing, missedFrames: 0, playbackDuration: 0, resource, onStreamError };
            };
            const onFailureCallback = () => {
                if (this.state.status === AudioPlayerStatus.Buffering && this.state.resource === resource) this.state = { status: AudioPlayerStatus.Idle };
            };

            resource.playStream.once('readable', onReadableCallback);
            void ['end', 'close', 'finish'].map((event: string) => resource.playStream.once(event, onFailureCallback));
            this.state = { status: AudioPlayerStatus.Buffering, resource, onReadableCallback, onFailureCallback, onStreamError };
        }
        return;
    };
    /**
     * @description Включаем музыку с пропуском
     * @param message {wMessage} Сообщение с сервера
     * @param seek {number} Пропуск музыки до 00:00:00
     */
    public seek = async (message: wMessage, seek: number): Promise<void> => {
        const {channels}: Queue = message.client.queue.get(message.guild.id);
        let stream: any;
        try {
            stream = await CreateResource(message, seek);

            await AutoJoinVoice(channels, this);
        } finally {
            setTimeout(async () => {
                await this.play(stream);
                this.playingTime = seek * 1000;
            }, 1e3);
        }
    };
    /**
     * @description Включаем музыку
     * @param message {wMessage} Сообщение с сервера
     */
    public static playStream = async (message: wMessage): Promise<boolean | void> => {
        const {client, guild} = message;
        const queue: Queue = client.queue.get(guild.id);

        if (queue.songs?.length === 0) return void queue.events.queue.emit('DestroyQueue', queue, message);
        const stream = await CreateResource(message) as any;

        client.console(`[${guild.id}]: [${queue.songs[0].type}]: [${queue.songs[0].title}]`);
        await queue.events.message.PlaySongMessage(message); //Отправляем данные в EventEmitter message для создания embed сообщения о текущем треке
        await AutoJoinVoice(queue.channels, queue.player); // Подключаем плеер к гс
        setImmediate(async () => queue.player.play(stream));
    }
}

/**
 * @description Подключаем плеер к голосовому каналу
 * @param channels {Queue_Channels} Все каналы в очереди
 * @param player {audioPlayer} Плеер
 */
async function AutoJoinVoice(channels: Queue_Channels, player: audioPlayer): Promise<void> {
    if (!channels.connection?.subscribe) (channels.connection = new VoiceManager().Join(channels.voice)).subscribe(player as any);
}
/**
 * @description Создаем Opus поток
 * @param message {wMessage} Сообщение с сервера
 * @param seek {number} Пропуск музыки до 00:00:00
 */
async function CreateResource(message: wMessage, seek: number = 0): Promise<FFmpegStream> {
    return new Promise(async (resolve) => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        const song = queue.songs[0];

        if (!song.format?.url) await FinderResource.init(song);

        return resolve(new FFmpegStream(song.format.url, {...queue.audioFilters, seek}));
    })
}
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//                                       Player events
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Когда плеер завершит песню, он возвратит эту функцию
 * @param message {wMessage} Сообщение с сервера
 */
async function onIdlePlayer(message: wMessage): Promise<NodeJS.Timeout | null | boolean | void> {
    const {client, guild} = message;
    const queue: Queue = client.queue.get(guild.id);

    if (!queue || queue?.songs?.length <= 0) return null;
    if (queue.player.state?.resource) void queue.player.state.resource.playStream.emit("close");
    if (queue.player.state?.missedFrames) await message.client.Send({text: `[AudioPlayer]: Lost Frames [${queue.player.state.missedFrames}]`, message: message, color: queue.player.state.missedFrames >= 10 ? "RED" : "GREEN" });

    await isRemoveSong(queue);
    if (queue.options.random) return Shuffle(message, queue);
    return audioPlayer.playStream(message);
}
/**
 * @description Когда плеер выдает ошибку, он возвратит эту функцию
 * @param err {AudioPlayerError} Ошибка
 * @param message {wMessage} Сообщение с сервера
 */
async function onErrorPlayer(err: AudioPlayerError, message: wMessage): Promise<void> {
    const {events, songs}: Queue = message.client.queue.get(message.guild.id);

    await events.message.WarningMessage(message, songs[0], err);
    if (songs) songs.shift();

    return;
}
/**
 * @description Когда плеер получает поток (музыку), он возвратит эту функцию
 * @param message {wMessage} Сообщение с сервера
 */
async function onBufferingPlayer(message: wMessage): Promise<NodeJS.Timeout | null | PlayerSubscription> {
    const {client, guild} = message;

    return setTimeout(async () => {
        const queue: Queue = client.queue.get(guild.id);
        const song: Song = queue?.songs[0];

        if (!queue) return;
        if (queue.player.state.status === 'buffering' && !queue.player.state?.resource?.started && !song.format?.work) {
            console.log(`[Fail load] -> `, song.format?.url);
            await client.Send({text: `${song.requester}, не удалось включить эту песню! Пропуск!`, message: queue.channels.message});
            queue.player.stop();
            return;
        }
    }, 15e3);
}
/**
 * @description Если плеер сам ставит на паузу
 * @param message {wMessage} Сообщение с сервера
 */
async function onAutoPausePlayer(message: wMessage) {
    const {channels, player}: Queue = message.client.queue.get(message.guild.id);

    //Проверяем если канал на который надо выводить музыку
    if (!channels.connection?.subscribe) (channels.connection = new VoiceManager().Join(channels.voice)).subscribe(player as any);
}
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Повтор музыки
 * @param queue {Queue} Очередь сервера
 */
async function isRemoveSong({options, songs}: Queue): Promise<null> {
    if (options.loop === "song") return null;
    else if (options.loop === "songs") {
        const repeat = songs.shift();
        songs.push(repeat);
    } else songs.shift();

    return null;
}
/**
 * @description Перетасовка музыки в очереди
 * @param message {wMessage} Сообщение с сервера
 * @param queue {Queue} Очередь сервера
 */
async function Shuffle(message: wMessage, {songs}: Queue): Promise<boolean | void> {
    const set: number = Math.floor(Math.random() * songs.length);
    const LocalQueue2: Song = songs[set];

    songs[set] = songs[0];
    songs[0] = LocalQueue2;

    return audioPlayer.playStream(message);
}
