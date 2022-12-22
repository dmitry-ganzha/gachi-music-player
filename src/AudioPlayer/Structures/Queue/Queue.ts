import {PlayerEvents} from "@Managers/PlayerManager";
import {ClientMessage} from "@Client/interactionCreate";
import {MessagePlayer} from "@Managers/PlayerMessages";
import {StageChannel, VoiceChannel} from "discord.js";
import {VoiceConnection} from "@discordjs/voice";
import {AudioPlayer} from "../AudioPlayer";
import {consoleTime} from "@Client/Client";
import {OpusAudio} from "@OpusAudio";
import {Song} from "./Song";

export type AudioFilters = Array<string> | Array<string | number>;

//Музыкальная очередь
export class Queue {
    #Timer: NodeJS.Timeout = null; //Таймер для авто удаления очереди
    #hasDestroying: boolean = false; //Статус удаления (запущено ли удаление)
    #songs: Array<Song> = []; //Все треки находятся здесь
    readonly #player: AudioPlayer = new AudioPlayer(); //Сам плеер
    //Каналы (message: TextChannel, voice: VoiceChannel)
    readonly #channels: { message: ClientMessage, voice: VoiceChannel | StageChannel };
    readonly #options: { random: boolean, loop: "song" | "songs" | "off", radioMode: boolean } = { //Уникальные настройки
        random: false, //Рандомные треки (каждый раз в плеере будет играть разная музыка из очереди)
        loop: "off", //Тип повтора (off, song, songs)
        radioMode: false //Режим радио
    };
    #filters: Array<string> | Array<string | number> = [];  //Фильтры для FFmpeg

    //Создаем очередь
    public constructor(message: ClientMessage, voice: VoiceChannel) {
        this.#channels = {message, voice};

        this.player.on("idle", () => PlayerEvents.onIdlePlayer(this));
        this.player.on("error", (err, isSkip) => PlayerEvents.onErrorPlayer(err, this, isSkip));
    };

    //Голосовой канал
    public get voice() { return this.#channels.voice; };
    public set voice(voiceChannel) { this.#channels.voice = voiceChannel; };

    //Сообщение
    public get message() { return this.#channels.message; };
    public set message(message) { this.#channels.message = message; };

    //Фильтры
    public get filters() { return this.#filters; };

    //Все треки
    public get songs() { return this.#songs; };
    public set songs(songs) { this.#songs = songs; };
    //Текущий трек
    public get song(): Song { return this.songs[0]; };

    //Данные плеера
    public get player() { return this.#player; };

    //Настройки
    public get options() { return this.#options; };

    //Голосовой канал этой очереди
    public get connection(): VoiceConnection { return this.player.voices.find((voice) => voice.joinConfig.channelId === this.voice.id); };

    //Сервер для которого создана очередь
    public get guild() { return this.message.guild; };

    /**
     * @description Меняет местами треки
     * @param num {number} Если есть номер для замены
     */
    public readonly swapSongs = (num?: number) => {
        if (this.songs.length === 1) return this.player.stop();

        swapPositions(this.songs, num ?? this.songs.length - 1);
        this.player.stop();
        return;
    };
    //Удаление очереди
    public readonly cleanup = () => {
        const message = this.message;
        const {client, guild} = message;

        //Удаляем сообщение о текущем треке
        if (message?.deletable) message?.delete().catch(() => undefined);

        //Если плеер еще не удален
        if (this.player) {
            //Удаляем голосовое подключение из плеера
            if (this.connection) this.player.voice(this.connection);

            //Отвязываем плеер от PlayerEvents
            this.player.removeAllListeners();
            this.player.stop();
            this.player.cleanup();
        }

        clearTimeout(this.#Timer);
        client.queue.delete(guild.id);
    };
    //Удаление очереди через время
    public readonly TimeDestroying = (state: "start" | "cancel"): void => {
        const player = this.player;

        //Запускаем таймер по истечению которого очереди будет удалена!
        if (state === "start") {
            if (this.#hasDestroying) return;

            this.#Timer = setTimeout(this.cleanup, 20e3);
            this.#hasDestroying = true;
            player.pause();
        } else { //Отменяем запущенный таймер
            if (!this.#hasDestroying) return;

            clearTimeout(this.#Timer);
            player.resume();
            this.#hasDestroying = false;
        }
    };
    //Добавляем трек в очередь
    public readonly push = (song: Song, sendMessage: boolean = false): void => {
        if (sendMessage) MessagePlayer.toPushSong(this, song);

        this.songs.push(song);
    };
    //Включаем первый трек из очереди
    public readonly play = (seek: number = 0) => {
        if (!this.song) return this.cleanup();

        //Получаем ссылку на resource
        this.song.resource(seek).then((url: string) => {
            if (!url) return this.player.emit("error", new Error("Audio resource not found!"), true);
            const streamingData = new OpusAudio(url,{seek, filters: this.song.isLive ? [] : this.filters});

            return this.player.readStream(streamingData);
        }).catch((err) => this.player.emit("error", new Error(err), true));

        if (!seek) {
            consoleTime(`[GuildID: ${this.guild.id}]: ${this.song.title}`); //Отправляем лог о текущем треке
            MessagePlayer.toPlay(this.message); //Отправляем сообщение с авто обновлением
        }
    };
}

/**
 * @description Смена позиции в Array
 * @param array {Array<any>} Array
 * @param position {number} Номер позиции
 */
export function swapPositions(array: any[], position: number): void {
    const first = array[0];
    array[0] = array[position];
    array[position] = first;
}