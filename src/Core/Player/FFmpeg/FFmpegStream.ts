import {opus} from "prism-media";
import {AudioFilters, FFmpeg, FFmpegArgs, CreateFilters} from '.';
import FFmpegConfiguration from "../../../../DataBase/FFmpeg.json";

/**
 * @description Подготавливаем, получаем и создаем объект схожий с (discordjs/voice)<AudioResource>
 */
export class FFmpegStream {
    public silencePaddingFrames: number = 0;
    public playbackDuration = 0;
    public started = false;
    public silenceRemaining = -1;
    public playStream: opus.OggDemuxer;
    protected FFmpeg: FFmpeg;
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
    /**
     * @param url {string} Ссылка
     * @param AudioFilters {AudioFilters} Какие фильтры надо использовать
     * @param seek {number} До скольки пропускаем музыку
     */
    public constructor(url: string, AudioFilters: AudioFilters = null, seek: number = 0) {
        this.FFmpeg = new FFmpeg(CreateArguments(url, AudioFilters, seek));
        this.playStream = new opus.OggDemuxer({autoDestroy: true});

        this.FFmpeg.pipe(this.playStream);

        this.playStream.once('readable', () => (this.started = true));
        ['end', 'close', 'error'].map((event) => this.playStream.once(event, this.destroy));
        return;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем пакет и проверяем не пустой ли он если не пустой к таймеру добавляем 20 мс
     */
    public read = (): Buffer | null => {
        const packet: Buffer = this.playStream?.read();
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
            [this.playStream].forEach((Stream) => {
                if (!Stream?.destroyed) {
                    Stream?.removeAllListeners();
                    Stream?.destroy();
                }
            });
            delete this.silencePaddingFrames;
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
    let Arguments = [...FFmpegConfiguration.Args.Other, "-af", CreateFilters(AudioFilters), ...FFmpegConfiguration.Args.OggOpus, ...FFmpegConfiguration.Args.DecoderPreset];

    if (url) Arguments = [ ...FFmpegConfiguration.Args.Reconnect, "-vn", ...FFmpegConfiguration.Args.Seek, seek ?? 0, '-i', url, ...Arguments];

    return Arguments;
}