import {User} from "discord.js";
import {Colors} from "../../../Core/Utils/LiteUtils";
import {DurationUtils} from "../../Manager/DurationUtils";
import {Images} from "../EmbedMessages";
import {ClientMessage} from "../../../Handler/Events/Activity/Message";
import {AudioFilters} from "./Queue";
import {httpsClient} from "../../../Core/httpsClient";
import {SoundCloud, Spotify, VK, YouTube} from "../../../Structures/Platforms";
import {FFmpeg} from "../Media/FFmpeg";

//Все возможные запросы данных в JSON формате
export const SupportPlatforms = {
    //YouTube
    "YOUTUBE": {
        "track": (search: string): Promise<InputTrack> => YouTube.getVideo(search) as Promise<InputTrack>,
        "playlist": (search: string): Promise<InputPlaylist> => YouTube.getPlaylist(search),
        "search": (search: string): Promise<InputTrack[]> => YouTube.SearchVideos(search),
    },
    //Spotify
    "SPOTIFY": {
        "track": (search: string): Promise<InputTrack> => Spotify.getTrack(search),
        "playlist": (search: string): Promise<InputPlaylist> => Spotify.getPlaylist(search),
        "search": (search: string): Promise<InputTrack[]> => Spotify.SearchTracks(search),
        "album": (search: string): Promise<InputPlaylist> => Spotify.getAlbum(search)
    },
    //SoundCloud
    "SOUNDCLOUD": {
        "track": (search: string): Promise<InputTrack> => SoundCloud.getTrack(search),
        "playlist": (search: string): Promise<InputPlaylist | InputTrack> => SoundCloud.getPlaylist(search),
        "search": (search: string): Promise<InputTrack[]> => SoundCloud.SearchTracks(search),
        "album": (search: string): Promise<InputPlaylist | InputTrack> => SoundCloud.getPlaylist(search)
    },
    //VK
    "VK": {
        "track": (search: string): Promise<InputTrack> => VK.getTrack(search),
        "playlist": (search: string): Promise<InputPlaylist> => VK.getPlaylist(search),
        "search": (search: string): Promise<InputTrack[]> => VK.SearchTracks(search),
    },
    //Discord
    "Discord": {
        "track": (search: string): Promise<InputTrack> => new FFmpeg.FFprobe(["-i", search]).getInfo().then((trackInfo: any) => {
            //Если не найдена звуковая дорожка
            if (!trackInfo) return null;

            return {
                url: search,
                title: search.split("/").pop(),
                author: null,
                image: {url: Images.NotImage},
                duration: {seconds: trackInfo.format.duration},
                format: {url: trackInfo.format.filename}
            };
        })
    }
}

//Создаем трек для внутреннего использования
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
    resourceLink: string;

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
        this.resourceLink = track?.format?.url
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

    //Получаем исходник трека
    public resource = (seek: number, filters: AudioFilters, req = 0): Promise<{url: string}> => new Promise(async (resolve) => {
        if (req > 3) return resolve(null);
        const checkResource = await httpsClient.checkLink(this.resourceLink);

        if (!this.resourceLink) this.resourceLink = (await SongFinder.findResource(this))?.url;

        if (checkResource === "OK") return resolve({ url: this.resourceLink });
        else {
            req++;
            return resolve(this.resource(seek, filters, req));
        }
    });
}

namespace SongFinder {
    //Получаем данные о треке заново
    export function findResource(song: Song): Promise<FFmpeg.FFmpegFormat> {
        const {type, url, author, title, duration} = song;

        if (type === "SPOTIFY") return FindTrack(`${author.title} - ${title}`, duration.seconds);

        // @ts-ignore
        const FindPlatform = SupportPlatforms[type];
        const FindCallback = FindPlatform["track"](url);

        return FindCallback.then((track: InputTrack) => track?.format);
    }
    //Ищем трек на YouTube
    function FindTrack(nameSong: string, duration: number): Promise<FFmpeg.FFmpegFormat> {
        return YouTube.SearchVideos(nameSong, {limit: 15}).then((Tracks) => {
            //Фильтруем треки оп времени
            const FindTracks: InputTrack[] = Tracks.filter((track: InputTrack) => {
                const DurationSong = DurationUtils.ParsingTimeToNumber(track.duration.seconds);

                //Как надо фильтровать треки
                return DurationSong === duration || DurationSong < duration + 10 && DurationSong > duration - 10;
            });

            //Если треков нет
            if (FindTracks?.length < 1) return null;

            //Получаем данные о треке
            return YouTube.getVideo(FindTracks[0].url).then((video) => video.format) as Promise<FFmpeg.FFmpegFormat>;
        });
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Уменьшаем <message.author>, для экономии ОЗУ
 * @param id {string} ID пользователя
 * @param username {string} Ник пользователя
 * @param avatarURL {string} Иконка пользователя
 */
function ConstRequester({id, username, avatar}: User) {
    return { username, id, avatarURL: () => `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp` };
}
//====================== ====================== ====================== ======================
/**
 * @description Подготавливаем время трека для системы
 * @param duration {InputTrackDuration} Время
 */
function ConstDuration(duration: InputTrackDuration): { StringTime: string | "Live"; seconds: number } {
    const seconds = parseInt(duration.seconds);
    return { seconds, StringTime: seconds > 0 ? DurationUtils.ParsingTimeToString(seconds) : "Live" };
}
//====================== ====================== ====================== ======================
/**
 * @description Цвет трека из названия платформы
 * @param type {string}
 */
function Color(type: string): number {
    switch (type) {
        case "YOUTUBE": return Colors.RED;
        case "SPOTIFY": return Colors.GREEN;
        case "SOUNDCLOUD": return Colors.ORANGE;
        case "VK": return Colors.BLUE_DARK;
        default: return Colors.BLUE;
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Ищем в ссылке тип трека
 * @param url {string} Ссылка
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

type SongType = "SPOTIFY" | "YOUTUBE" | "VK" | "SOUNDCLOUD" | "UNKNOWN";

//Какие данные доступны в <song>.requester
interface SongRequester {
    id: string;
    username: string;
    avatarURL: () => string | null;
}

//Пример получаемого трека
export interface InputTrack {
    title: string;
    url: string;
    duration: {
        seconds: string;
    };
    image?: { url: string; height?: number; width?: number };
    author: {
        title: string;
        url: string | undefined;
        image?: {
            url: string | undefined;
            width?: number;
            height?: number;
        };
        isVerified?: boolean;
    },
    format?: FFmpeg.FFmpegFormat | {url: string | undefined};
    isLive?: boolean;
    isPrivate?: boolean;
    isValid?: boolean;
    PrevFile?: string;
}
export type InputTrackDuration = InputTrack["duration"];
export type InputTrackImage = InputTrack["image"];
//Пример получаемого автора трека
export interface InputAuthor {
    title: string;
    url: string | undefined;
    image?: {
        url: string | undefined;
        width?: number;
        height?: number;
    };
    isVerified?: boolean;
}
//Пример получаемого плейлиста
export interface InputPlaylist {
    url: string;
    title: string;
    items: InputTrack[];
    image: {
        url: string;
    };
    author?: InputAuthor;
}