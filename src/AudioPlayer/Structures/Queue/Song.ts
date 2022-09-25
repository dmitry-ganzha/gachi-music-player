import {Colors} from "discord.js";
import {DurationUtils} from "../../Manager/DurationUtils";
import {Images} from "../EmbedMessages";
import {ClientMessage} from "../../../Handler/Events/Activity/Message";
import {AudioFilters} from "./Queue";
import {httpsClient} from "../../../Core/httpsClient";
import {SoundCloud, Spotify, VK, YouTube} from "../../../Structures/Platforms";
import {FFmpeg} from "../Media/FFmpeg";
import {FileSystem} from "../../../Core/FileSystem";

/*
Для добавления своей платформы нужно добавить в {SupportPlatforms} и {PlatformReg}. Для получения названия платформы и данных с нее
Для добавления ее в поиск нужно добавить в {SearchPlatforms} сокращение: название платформы
Так-же можно добавить свой цвет в {ColorTrack}
Все для добавления своей поддержки разных платформ находится в этом файле
 */

export const FailRegisterPlatform: Set<SupportPlatforms> = new Set();

//Проверяем наличие данных авторизации
(() => {
    if (!FileSystem.env("SPOTIFY_ID") || !FileSystem.env("SPOTIFY_SECRET")) FailRegisterPlatform.add("SPOTIFY");
    if (!FileSystem.env("VK_TOKEN")) FailRegisterPlatform.add("VK");
})();

//Все возможные запросы данных в JSON формате
export const SupportPlatforms = {
    //YouTube
    "YOUTUBE": {
        "track": (search: string): Promise<InputTrack> => YouTube.getVideo(search) as Promise<InputTrack>,
        "playlist": (search: string): Promise<InputPlaylist> => YouTube.getPlaylist(search),
        "search": (search: string): Promise<InputTrack[]> => YouTube.SearchVideos(search)
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
        "search": (search: string): Promise<InputTrack[]> => VK.SearchTracks(search)
    },
    //Discord
    "DISCORD": {
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
};
//Доступные платформы для поиска
export const SearchPlatforms = {
    "yt": "YOUTUBE",
    "sp": "SPOTIFY",
    "sc": "SOUNDCLOUD",
    "vk": "VK"
};
//Цвета названий платформ
const ColorTrack = {
    "YOUTUBE": 0xed4245,
    "SPOTIFY": 1420288,
    "SOUNDCLOUD": 0xe67e22,
    "VK": 30719,
    "DISCORD": Colors.Grey
};
//Reg для поиска платформы
const PlatformReg = {
    youtube: /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi,
    spotify: /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi,
    soundcloud: /^(?:(https?):\/\/)?(?:(?:www|m)\.)?(api\.soundcloud\.com|soundcloud\.com|snd\.sc)\/(.*)$/gi,
    vk: /vk.com/gi,
    discord: /cdn.discordapp.com/gi
};

//Поддерживаемые платформы
export type SupportPlatforms = "YOUTUBE" | "SPOTIFY" | "VK" | "SOUNDCLOUD" | "DISCORD";
//Поддерживаемые тип для этих платформ
export type SupportType = "track" | "playlist" | "search" | "album";

//Выдает платформу из ссылки
export function TypePlatform(url: string): SupportPlatforms {
    let keyPlatform: string = null;

    Object.entries(PlatformReg).forEach(([key, value]) => {
        if (url.match(value)) keyPlatform = key;
    });
    return keyPlatform ? keyPlatform.toUpperCase() as SupportPlatforms : null;
}

//Создаем трек для внутреннего использования
export class Song {
    readonly #title: string;
    readonly #url: string;
    readonly #author: InputAuthor;
    readonly #duration: {
        seconds: number,
        full: string
    };
    readonly #image: InputTrack["image"];
    readonly #requester: SongRequester;
    readonly #isLive: boolean;
    readonly #color: number;
    readonly #type: SupportPlatforms;
    protected resourceLink: string;

    public constructor(track: InputTrack, author: ClientMessage["author"]) {
        const type = TypePlatform(track.url);
        const {username, id, avatar} = author;
        const seconds = parseInt(track.duration.seconds);

        this.#title = track.title;
        this.#url = track.url;
        this.#author = {
            url: track.author?.url ?? `https://discordapp.com/users/${id}`,
            title: track.author?.title ?? username,
            image: track.author?.image ?? {url: Images.NotImage},
            isVerified: track.author?.isVerified ?? undefined
        };
        this.#duration = { seconds, full: seconds > 0 ? DurationUtils.ParsingTimeToString(seconds) : "Live" };
        this.#image = track.image;
        this.#requester = { username, id, avatarURL: () => `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp` };
        this.#isLive = track.isLive;
        this.#color = ColorTrack[type];
        this.#type = type;
        this.resourceLink = track?.format?.url
    }
    //Название трека
    public get title() { return this.#title; };
    //Ссылка на трек
    public get url() { return this.#url; };
    //Автор трека
    public get author() { return this.#author; };
    //Время трека
    public get duration() { return this.#duration; };
    //Картинки трека
    public get image() { return this.#image; };
    //Пользователь включивший трек
    public get requester() { return this.#requester; };
    //Этот трек потоковый
    public get isLive() { return this.#isLive; };
    //Цвет трека
    public get color() { return this.#color; };
    //Тип трека
    public get type() { return this.#type; };

    //Получаем исходник трека
    public resource = (seek: number, filters: AudioFilters, req = 0): Promise<string> => new Promise(async (resolve) => {
        if (req > 3) return resolve(null);
        const checkResource = await httpsClient.checkLink(this.resourceLink);

        if (!this.resourceLink) this.resourceLink = (await SongFinder.findResource(this))?.url;

        if (checkResource === "OK") return resolve(this.resourceLink);
        else {
            req++;
            return this.resource(seek, filters, req).then(resolve);
        }
    });
}

//Ищет исходный ресурс треков
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
                return DurationSong === duration || DurationSong < duration + 27 && DurationSong > duration - 5;
            });

            //Если треков нет
            if (FindTracks?.length < 1) return null;

            //Получаем данные о треке
            return YouTube.getVideo(FindTracks[0].url).then((video) => video.format) as Promise<FFmpeg.FFmpegFormat>;
        });
    }
}

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