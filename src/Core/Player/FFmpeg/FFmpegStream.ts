import {opus} from "prism-media";
import {CreateFilters, FFmpegArgs, FFmpegArguments} from "./index";
import {FFmpeg, AudioFilters} from './index';
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
    protected opusEncoder = new opus.OggDemuxer({ destroy: () => this.destroy() });
    //====================== ====================== ====================== ======================
    /**
     * @description Для проверки, читабельный ли стрим
     */
    public get readable() {
        if (this.silenceRemaining === 0) return false;
        const read = this.playStream.readable;
        if (!read) {
            if (this.silenceRemaining === -1) this.silenceRemaining = this.silencePaddingFrames;
            return this.silenceRemaining !== 0;
        }
        return read;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Для проверки, закончился ли стрим ресурса
     */
    public get ended() {
        return this.playStream?.readableEnded || this.playStream?.destroyed || !this.playStream;
    };
    //====================== ====================== ====================== ======================
    public constructor(url: string | any, AudioFilters: AudioFilters = null, seek: number = 0) {
        this.FFmpeg = new FFmpeg(CreateArguments(url, AudioFilters, seek));

        this.playStream = this.FFmpeg.pipe(this.opusEncoder);
        this.playStream.once('readable', () => (this.started = true));
        ['end', 'close', 'error'].map((event) => this.playStream.once(event, this.destroy));
        return;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем пакет и проверяем не пустой ли он если не пустой к таймеру добавляем 20 мс
     */
    public read = (): Buffer | null => {
        const packet = this.playStream?.read();
        if (packet) this.playbackDuration += 20;
        return packet;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Чистим память!
     */
    public destroy = (): void => {
        if (this.FFmpeg) {
            this.FFmpeg.destroy();
            delete this.FFmpeg;
        }

        //Delete other
        delete this.playbackDuration;
        delete this.started;
        delete this.silenceRemaining;

        setTimeout(() => {
            [this.playStream, this.opusEncoder].forEach((Stream) => {
                if (!Stream?.destroyed) {
                    Stream.removeAllListeners();
                    Stream.destroy();
                    Stream.read();
                }
            });
            delete this.silencePaddingFrames;
            delete this.opusEncoder;
            delete this.playStream;
        }, 125);
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем аргументы для FFmpeg
 * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 * @param url {string} Ссылка
 * @param seek {number} Пропуск музыки до 00:00:00
 * @constructor
 */
function CreateArguments (url: string, AudioFilters: AudioFilters, seek: number): FFmpegArgs {
    return [
        ...FFmpegArguments.Reconnect, "-vn", ...FFmpegArguments.Seek, seek ?? 0,
        '-i', url, ...FFmpegArguments.Other,
        "-af", CreateFilters(AudioFilters), ...FFmpegArguments.OggOpus, ...FFmpegArguments.Compress, ...FFmpegArguments.DecoderPreset
    ];
}
