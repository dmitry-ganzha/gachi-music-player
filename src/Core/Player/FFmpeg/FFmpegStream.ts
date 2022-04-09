import {opus} from "prism-media";
import {CreateFilters, FFmpegArgs, FFmpegArguments} from "./index";
import {FFmpeg, AudioFilters} from '.';
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
    protected opusEncoder = new opus.OggDemuxer({ destroy: () => this.destroy().catch(() => undefined) });

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

    public constructor(url: string | any, AudioFilters: AudioFilters = null, seek: number = 0) {
        this.FFmpeg = new FFmpeg(CreateArguments(url, AudioFilters, seek));

        this.playStream = this.FFmpeg.pipe(this.opusEncoder);
        this.playStream.once('readable', () => (this.started = true));
        ['end', 'close', 'error'].map((event) => this.playStream.once(event, this.destroy));
        return;
    };

    /**
     * @description Получаем пакет и проверяем не пустой ли он если не нустой к таймеру добовляем 20 мс
     */
    public read = (): Buffer | null => {
        const packet = this.playStream?.read();
        if (packet) this.playbackDuration += 20;
        return packet;
    };

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
