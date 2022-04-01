import {ConstFormat, Song} from "../Queue/Structures/Song";
import {Queue} from "../Queue/Structures/Queue";
import {opus} from "prism-media";
import {FFmpeg, FFmpegArgs, FFmpegArguments} from "./FFmpeg";
import {AudioPlayer} from "./AudioPlayer";
import {httpsClient} from "../../httpsClient";
import {InputFormat} from "../../Utils/TypeHelper";
import {VK, YouTube} from "../../Platforms";

export type AudioFilters = Queue['audioFilters'] & {seek?: number};

//====================== ====================== ====================== ======================
/**
 * @description Заготавливаем необходимые данные для создания потока
 */
export async function FindResource(song: Song, req: number = 0): Promise<void> {
    if (req > 5) return;

    //Получаем данные о ресурсе
    let format = await getLinkFormat(song);
    if (!format) return FindResource(song, req++);

    //Подгоняем под общую сетку
    song.format = ConstFormat(format);

    //Проверяем можно ли скачивать с ресурса
    const resource = await new httpsClient().Request(song.format?.url, {request: {maxRedirections: 5, method: "GET"}});
    if (resource?.statusCode === 200) {
        song.format.work = true;
        return;
    }
    //Если этот формат невозможно включить прогоняем по новой
    if (resource?.statusCode >= 400 && resource?.statusCode <= 500) return FindResource(song, req++);
    return;
}

/**
 * @description Получаем данные формата
 * @param song {Song} Трек
 */
async function getLinkFormat({type, url, title, author}: Song): Promise<InputFormat> {
    try {
        if (type === "SPOTIFY") return FindTrack(`${author.title} - ${title}`);
        else if (type === "VK") return (await VK.getTrack(url))?.format;
        return getFormatYouTube(url);
    } catch {
        console.log('[FindResource]: [Fail to found format!]');
        return null;
    }
}

/**
 * @description Ищем трек на youtube
 * @param nameSong {string} Название музыки
 * @constructor
 */
async function FindTrack(nameSong: string): Promise<InputFormat> {
    const Song: string = await YouTube.SearchVideos(nameSong, {onlyLink: true}) as string;
    if (Song) return getFormatYouTube(Song);
    return null;
}

/**
 * @description Получаем от видео аудио формат
 * @param url {string} Ссылка
 */
function getFormatYouTube(url: string): Promise<InputFormat> {
    return YouTube.getVideo(url, {onlyFormats: true});
}


//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================

/**
 * @description Подготавливаем, получаем и создаем объект схожий с discord.js {AudioResource}
 */
export class FFmpegStream {
    public silencePaddingFrames: number = 0;
    public playbackDuration = 0;
    public started = false;
    public silenceRemaining = -1;
    public playStream: opus.OggDemuxer;
    protected FFmpeg: FFmpeg;
    protected opusEncoder: opus.OggDemuxer = new opus.OggDemuxer({ destroy: () => this.destroy().catch(() => undefined) });

    //Для проверки, читабельный ли стрим
    public get readable() {
        if (this.silenceRemaining === 0) return false;
        const read = this.playStream.readable;
        if (!read) {
            if (this.silenceRemaining === -1) this.silenceRemaining = this.silencePaddingFrames;
            return this.silenceRemaining !== 0;
        }
        return read;
    };
    //Для проверки, закончился ли стрим ресурса
    public get ended() {
        return this.playStream?.readableEnded || this.playStream?.destroyed || !this.playStream;
    };

    public constructor(url: string | any, AudioFilters: AudioFilters) {
        this.FFmpeg = new FFmpeg(CreateArguments(AudioFilters, url) as any);
        this.playStream = this.FFmpeg.pipe(this.opusEncoder);
        this.playStream.once('readable', () => (this.started = true));
        ['end', 'close', 'error'].map((event) => this.playStream.once(event, this.destroy));
        return;
    };

    /**
     * @description Использует Discord.js player
     */
    public read = (): Buffer | null => {
        const packet = this.playStream?.read();
        if (packet) this.playbackDuration += 20;
        return packet;
    }

    /**
     * @description Чистим память!
     */
    public destroy = async (): Promise<void> => {
        if (this.FFmpeg) {
            this.FFmpeg.destroy();
            delete this.FFmpeg;
        }

        //Delete other
        delete this.playbackDuration;
        delete this.started;
        delete this.silenceRemaining;

        setTimeout(() => {
            //Cleanup playStream
            if (this.playStream) {
                this.playStream.removeAllListeners();
                this.playStream.destroy();
                this.playStream.read();
                delete this.playStream;
            }

            //Cleanup opusEncoder
            if (this.opusEncoder) {
                this.opusEncoder.removeAllListeners();
                this.opusEncoder.destroy();
                this.opusEncoder.read();
                delete this.opusEncoder;
            }
            delete this.silencePaddingFrames;
        }, 125);

        return;
    };
}

/**
 * @description Создаем аргументы для FFmpeg
 * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 * @param url {string} Ссылка
 * @constructor
 */
function CreateArguments (AudioFilters: AudioFilters, url: string): FFmpegArgs {
    return [
        ...FFmpegArguments.Reconnect, ...FFmpegArguments.Seek, AudioFilters?.seek ?? 0,
        '-i', url, "-vn", ...FFmpegArguments.Other,
        ...CreateFilters(AudioFilters), ...FFmpegArguments.OggOpus, ...FFmpegArguments.Compress, ...FFmpegArguments.DecoderPreset
    ];
}

/**
 * @description Создаем фильтры для FFmpeg
 * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 * @constructor
 */
function CreateFilters(AudioFilters: AudioFilters): FFmpegArgs  {
    if (!AudioFilters) return [];

    let resp: string[] = [], resSt = '', num = 0;

    if (AudioFilters._3D) resp = [...resp, FFmpegArguments.Filters._3D];
    if (AudioFilters.speed) resp = [...resp, `${FFmpegArguments.Filters.Speed}${AudioFilters.speed}`];
    if (AudioFilters.karaoke) resp = [...resp, FFmpegArguments.Filters.Karaoke];
    if (AudioFilters.echo) resp = [...resp, FFmpegArguments.Filters.Echo];

    if (AudioFilters.nightcore) resp = [...resp, FFmpegArguments.Filters.NightCore];
    if (AudioFilters.Vw) resp = [...resp, FFmpegArguments.Filters.vaporwave];

    if (AudioFilters.bass) resp = [...resp, `${FFmpegArguments.Filters.bassboost}${AudioFilters.bass}`];
    if (AudioFilters.Sab_bass) resp = [...resp, FFmpegArguments.Filters.Sub_boost];

    resp = [...resp, FFmpegArguments.Filters.AudioFade];

    for (let i in resp) {
        if (num === resp.length) resSt += `${resp[i]}`;
        resSt += `${resp[i]},`;
        num++;
    }

    return resSt === '' ? [] : ['-af', resp] as any;
}
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================

//База с плеерами
let audioPlayers: AudioPlayer[] = [];

let AudioCycleInterval: NodeJS.Timeout | undefined;
let nextTime = -1;

//Проверяем плееры на возможность включить музыку в голосовые каналы
function audioCycleStep() {
    if (nextTime === -1) return;

    nextTime += 20;
    const available = audioPlayers.filter((player) => player.checkPlayable);

    return prepareNextAudioFrame(available);
}

//Подготавливаем пакет с музыкой и отправляем в голосовой канал
function prepareNextAudioFrame(players: AudioPlayer[]) {
    const nextPlayer = players.shift();

    if (!nextPlayer) {
        if (nextTime !== -1) AudioCycleInterval = setTimeout(audioCycleStep, nextTime - Date.now());
        return;
    }

    nextPlayer['_sendPacket']();

    setImmediate(() => prepareNextAudioFrame(players));
}

function hasAudioPlayer(target: AudioPlayer) {
    return audioPlayers.includes(target);
}

//Добавляем плеер в базу
export function addAudioPlayer(player: AudioPlayer): void {
    if (hasAudioPlayer(player)) return;
    audioPlayers.push(player);
    if (audioPlayers.length === 1) {
        nextTime = Date.now();
        setImmediate(audioCycleStep);
    }
    return;
}

//Удаляем плеер из базы
export function deleteAudioPlayer(player: AudioPlayer) {
    const index = audioPlayers.indexOf(player);
    if (index === -1) return;
    audioPlayers.splice(index, 1);

    if (audioPlayers.length === 0) {
        audioPlayers = [];
        nextTime = -1;
        if (typeof AudioCycleInterval !== 'undefined') clearTimeout(AudioCycleInterval);
    }
}