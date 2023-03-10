import {SongFinder, platform, platformSupporter} from "../SongSupport";
import {DownloadManager} from "@Managers/DownloadManager";
import {ClientMessage} from "@Client/interactionCreate";
import {DurationUtils} from "@Managers/DurationUtils";
import {httpsClient} from "@httpsClient";
import {Music} from "@db/Config.json";

//Создаем трек для внутреннего использования
export class Song {
    readonly #title: string;
    readonly #url: string;
    readonly #author: InputAuthor;
    readonly #duration: { seconds: number, full: string };
    readonly #image: InputTrack["image"];
    readonly #requester: SongRequester;
    readonly #isLive: boolean;
    readonly #color: number;
    readonly #platform: platform;

    #resLink: string;

    public constructor(track: InputTrack, author: ClientMessage["author"]) {
        const platform = platformSupporter.getPlatform(track.url);
        const {username, id, avatar} = author;
        const seconds = parseInt(track.duration.seconds);

        this.#title = track.title;
        this.#url = track.url;
        this.#author = {
            url: track.author?.url ?? `https://discordapp.com/users/${id}`,
            title: track.author?.title ?? username,
            image: track.author?.image ?? {url: Music.images._image},
            isVerified: track.author?.isVerified ?? undefined
        };
        this.#duration = {seconds, full: seconds > 0 ? DurationUtils.ParsingTimeToString(seconds) : "Live"};
        this.#image = track.image;
        this.#requester = {username, id, avatarURL: () => `https://cdn.discordapp.com/avatars/${id}/${avatar}.webp`};
        this.#isLive = track.isLive;
        this.#color = platformSupporter.getColor(platform);
        this.#platform = platform;
        this.#resLink = track?.format?.url;
    };

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
    public get platform() { return this.#platform; };

    public get link() { return this.#resLink; };
    private set link(url: string) { this.#resLink = url; };

    //Получаем исходник трека
    public resource = (seek: number, req = 0): Promise<string> => new Promise(async (resolve) => {
        if (req > 3) return resolve(null);
        const CacheMusic = Music.CacheMusic;

        //Если пользователь включил кеширование музыки
        if (CacheMusic) {
            const info = DownloadManager.getNames(this);

            //Если есть файл выдаем путь до него
            if (info.status === "final") return resolve(info.path);
        }

        //Если нет ссылки, то ищем трек
        if (!this.link) this.link = await SongFinder.getLinkResource(this);

        //Проверяем ссылку на работоспособность
        const checkResource = await httpsClient.checkLink(this.link);

        //Если ссылка работает
        if (checkResource === "OK") {
            if (CacheMusic) setImmediate(() => DownloadManager.download(this, this.link));
            return resolve(this.link);
        }

        //Если ссылка не работает, то удаляем ссылку и делаем новый запрос
        req++;
        this.link = null;
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
    format?: { url: string | undefined };
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