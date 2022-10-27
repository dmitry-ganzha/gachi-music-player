import {DurationUtils} from "../../Manager/DurationUtils";
import {Images} from "../EmbedMessages";
import {ClientMessage} from "../../../Handler/Events/Activity/Message";
import {httpsClient} from "../../../Core/httpsClient";
import {FFmpeg} from "../Media/FFmpeg";
import {ColorTrack, SongFinder, SupportPlatforms, TypePlatform} from "../SongSupport";
import cfg from "../../../../DataBase/Config.json";
import {DownloadManager} from "../../Manager/DownloadManager";

const Download = DownloadManager.downloadUrl;

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
    #resLink: string;

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
        this.#duration = {seconds, full: seconds > 0 ? DurationUtils.ParsingTimeToString(seconds) : "Live"};
        this.#image = track.image;
        this.#requester = {username, id, avatarURL: () => `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp`};
        this.#isLive = track.isLive;
        this.#color = ColorTrack[type];
        this.#type = type;
        this.#resLink = track?.format?.url
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
    private get link() { return this.#resLink; };
    private set link(url: string) { this.#resLink = url; };

    //Получаем исходник трека
    public resource = (seek: number, req = 0): Promise<string> => new Promise(async (resolve) => {
        if (req > 10) return resolve(null);
        if (cfg.CacheMusic) {
            const isCache = Download(this);

            if (isCache) return resolve(isCache as string);
        }
        const checkResource = await httpsClient.checkLink(this.link);

        if (!this.link) this.link = (await SongFinder.findResource(this))?.url;

        if (checkResource === "OK") {
            if (cfg.CacheMusic) Download(this, this.link);
            return resolve(this.link);
        }

        req++;
        return resolve(this.resource(seek, req));
    });
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
    format?: FFmpeg.Format | { url: string | undefined };
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