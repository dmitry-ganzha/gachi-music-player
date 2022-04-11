import {ParserTimeSong} from "../../Manager/Duration/ParserTimeSong";
import {User} from "discord.js";
import {
    FFmpegFormat, InputFormat,
    InputTrack,
    InputTrackAuthor,
    InputTrackDuration,
    InputTrackImage
} from "../../../Utils/TypeHelper";
import {ClientMessage} from "../../../Client";
import {Colors} from "../../../Utils/Colors";

type SongType = "SPOTIFY" | "YOUTUBE" | "VK" | "SOUNDCLOUD" | "UNKNOWN";

export class Song {
    public id: string | number;
    public title: string;
    public url: string;
    public author: InputTrackAuthor;
    public duration: {
        seconds: number,
        StringTime: string
    };
    public image: InputTrackImage;
    public requester: User;
    public isLive: boolean;
    public color: number;
    public type: SongType;
    public format: FFmpegFormat;

    public constructor(track: InputTrack, {author}: ClientMessage) {
        const type = Type(track.url);

        this.id = track.id;
        this.title = track.title;
        this.url = track.url;
        this.author = track.author;
        this.duration = ConstDuration(track.duration);
        this.image = track.image;
        this.requester = author;
        this.isLive = track.isLive;
        this.color = Color(type);
        this.type = type;
        this.format = ConstFormat(track.format);
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Подготавливаем время трека для системы
 * @param duration {InputTrackDuration} Время
 * @constructor
 */
function ConstDuration(duration: InputTrackDuration): { StringTime: string | "Live"; seconds: number } {
    const seconds = parseInt(duration.seconds);
    return {
        seconds, StringTime: seconds > 0 ? ParserTimeSong(seconds) : 'Live'
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Подготавливаем цвет трека
 * @param type {string}
 * @constructor
 */
function Color(type: string): number {
    if (type === "YOUTUBE") return Colors.RED;
    else if (type === "SPOTIFY") return Colors.GREEN;
    else if (type === 'SOUNDCLOUD') return Colors.ORANGE;
    return Colors.BLUE;
}
//====================== ====================== ====================== ======================
/**
 * @description Ищем в ссылке тип трека
 * @param url {string} Ссылка
 * @constructor
 */
function Type(url: string): SongType {
    try {
        let start = url.split('://')[1].split('/')[0];
        let split = start.split(".");
        return (split[split.length - 2]).toUpperCase() as SongType;
    } catch {
        return "UNKNOWN";
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Подготавливаем формат трека для FFmpeg
 * @param format {InputFormat} Исходный формат
 * @constructor
 */
export function ConstFormat (format: InputFormat): null | FFmpegFormat {
    if (!format) return null;

    return {
        url: format.url,
        // @ts-ignore
        work: format?.work
    };
}