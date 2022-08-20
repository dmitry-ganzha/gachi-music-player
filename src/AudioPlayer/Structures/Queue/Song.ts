import {User} from "discord.js";
import {
    FFmpegFormat, InputAuthor,
    InputTrack,
    InputTrackDuration,
    InputTrackImage
} from "../../../Core/Utils/TypeHelper";
import {Colors} from "../../../Core/Utils/LiteUtils";
import {DurationUtils} from "../../Manager/DurationUtils";
import {Images} from "../EmbedMessages";
import {ClientMessage} from "../../../Handler/Events/Activity/Message";

type SongType = "SPOTIFY" | "YOUTUBE" | "VK" | "SOUNDCLOUD" | "UNKNOWN";

/**
 * @description Какие данные доступны в <song>.requester
 */
interface SongRequester {
    id: string;
    username: string;
    avatarURL: () => string | null;
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем трек для внутреннего использования
 */
export class Song {
    readonly #_title: string;
    readonly #_url: string;
    readonly #_author: InputAuthor;
    readonly #_duration: {
        seconds: number,
        StringTime: string
    };
    readonly #_image: InputTrackImage;
    readonly #_requester: SongRequester;
    readonly #_isLive: boolean;
    readonly #_color: number;
    readonly #_type: SongType;
    #_format: FFmpegFormat;

    public constructor(track: InputTrack, author: ClientMessage["author"]) {
        const type = Type(track.url);

        this.#_title = track.title;
        this.#_url = track.url;
        this.#_author = {
            url: track.author?.url ?? `https://discordapp.com/users/${author.id}`,
            title: track.author?.title ?? author.username,
            image: track.author?.image ?? {url: Images.NotImage},
            isVerified: track.author?.isVerified ?? undefined
        };
        this.#_duration = ConstDuration(track.duration);
        this.#_image = track.image;
        this.#_requester = ConstRequester(author);
        this.#_isLive = track.isLive;
        this.#_color = Color(type);
        this.#_type = type;
        this.#_format = {url: track?.format?.url}
    }
    //Название трека
    public get title() {
        return this.#_title;
    };
    //Ссылка на трек
    public get url() {
        return this.#_url;
    };
    //Автор трека
    public get author() {
        return this.#_author;
    };
    //Время трека
    public get duration() {
        return this.#_duration;
    };
    //Картинки трека
    public get image() {
        return this.#_image;
    };
    //Пользователь включивший трек
    public get requester() {
        return this.#_requester;
    };
    //Этот трек потоковый
    public get isLive() {
        return this.#_isLive;
    };
    //Цвет трека
    public get color() {
        return this.#_color;
    };
    //Тип трека
    public get type() {
        return this.#_type;
    };
    //Исходные данные на ресурс трека
    public get format() {
        return this.#_format;
    };
    public set format(format) {
        this.#_format = format;
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Уменьшаем <message.author>, для экономии ОЗУ
 * @param id {string} ID пользователя
 * @param username {string} Ник пользователя
 * @param avatarURL {string} Иконка пользователя
 * @constructor
 */
function ConstRequester({id, username, avatar}: User) {
    return {
        username, id, avatarURL: () => `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp`
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
        seconds, StringTime: seconds > 0 ? DurationUtils.ParsingTimeToString(seconds) : "Live"
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Цвет трека из названия платформы
 * @param type {string}
 * @constructor
 */
function Color(type: string): number {
    switch (type) {
        case "YOUTUBE": return Colors.RED;
        case "SPOTIFY": return Colors.GREEN;
        case "SOUNDCLOUD": return Colors.ORANGE;
        case "VK": return Colors.BLUE_DARK;
        case "TWITCH": return Colors.PURPLE;
        default: return Colors.BLUE;
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Ищем в ссылке тип трека
 * @param url {string} Ссылка
 * @constructor
 */
function Type(url: string): SongType {
    try {
        let start = url.split("://")[1].split("/")[0];
        let split = start.split(".");
        return (split[split.length - 2]).toUpperCase() as SongType;
    } catch {
        return "UNKNOWN";
    }
}