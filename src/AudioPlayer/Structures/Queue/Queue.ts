import {StageChannel, VoiceChannel} from "discord.js";
import {AudioPlayer} from "../../Player/AudioPlayer";
import {Song} from "./Song";
import {ClientMessage} from "../../../Handler/Events/Activity/Message";
import {PlayerEventsCallBacks} from "../../Manager/PlayerManager";
import {VoiceConnection} from "@discordjs/voice";

export type LoopType = "song" | "songs" | "off";
export type AudioFilters = Array<string> | Array<string | number>;

//Музыкальная очередь
export class Queue {
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

    //Данные плеера
    public get player() { return this.#player; };
    //Настройки
    public get options() { return this.#options; };
    //Голосовой канал этой очереди
    public get connection(): VoiceConnection { return this.player.voices.find((voice) => voice.joinConfig.channelId === this.voice.id); };

    #Timer: NodeJS.Timeout = null; //Таймер для авто удаления очереди
    #hasDestroying: boolean = false; //Статус удаления (запущено ли удаление)

    readonly #songs: Array<Song> = []; //Все треки находятся здесь
    readonly #player: AudioPlayer = new AudioPlayer(); //Сам плеер
    //Каналы (message: TextChannel, voice: VoiceChannel, connection: VoiceConnection)
    readonly #channels: { message: ClientMessage, voice: VoiceChannel | StageChannel};
    readonly #options: { random: boolean, loop: LoopType, stop: boolean } = { //Уникальные настройки
        random: false, //Рандомные треки (каждый раз в плеере будет играть разная музыка из очереди)
        loop: "off", //Тип повтора (off, song, songs)
        stop: false, //Пользователь выключил музыки или музыка сама закончилась
    };
    #filters: Array<string> | Array<string | number> = [];  //Фильтры для FFmpeg

    //Создаем очередь
    public constructor(message: ClientMessage, voice: VoiceChannel) {
        this.#channels = { message, voice };

        this.player.on("idle", () => PlayerEventsCallBacks.onIdlePlayer(this));
        this.player.on("StartPlaying", (seek) => PlayerEventsCallBacks.onStartPlaying(this, seek));
        this.player.on("error", (err, isSkip) => PlayerEventsCallBacks.onErrorPlayer(err, this, isSkip));
    };

    /**
     * @description Меняет местами треки
     * @param customNum {number} Если есть номер для замены
     */
    public readonly swapSongs = (customNum?: number) => {
        if (this.songs.length === 1) return this.player.stop();

        const SetNum = customNum ? customNum : this.songs.length - 1;
        const ArraySongs: Array<Song> = this.songs;
        const hasChange = ArraySongs[SetNum];

        ArraySongs[SetNum] = ArraySongs[0];
        ArraySongs[0] = hasChange;
        this.player.stop();
        return;
    };

    //Удаление очереди
    public readonly cleanup = (sendDelQueue: boolean = true) => {
        const message = this.message
        const {client, guild} = message;

        //Удаляем сообщение о текущем треке
        if (message?.deletable) message?.delete().catch(() => undefined);

        if (this.player) {
            if (this.connection) this.player.unsubscribe({connection: this.connection});

            this.player.stop();
        }

        clearTimeout(this.#Timer);
        if (sendDelQueue && client.queue.get(guild.id)) {
            if (this.options.stop) client.sendMessage({text: "🎵 | Музыка была выключена", message, type: "css"});
            else client.sendMessage({text: "🎵 | Музыка закончилась", message, type: "css"});
        }

        client.queue.delete(guild.id);
    };
    //Удаление очереди через время
    public readonly TimeDestroying = (state: "start" | "cancel"): void => {
        const player = this.player;

        //Запускаем таймер по истечению которого очереди будет удалена!
        if (state === "start") {
            if (this.#hasDestroying) return;

            this.#Timer = setTimeout(() => this.cleanup(false), 20e3);
            this.#hasDestroying = true;
            player.pause();
        } else { //Отменяем запущенный таймер
            if (!this.#hasDestroying) return;

            clearTimeout(this.#Timer);
            player.resume();
            this.#hasDestroying = false;
        }
    };
}