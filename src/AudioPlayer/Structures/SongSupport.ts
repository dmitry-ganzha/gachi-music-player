import {SoundCloud, Spotify, VK, YandexMusic, YouTube} from "@APIs";
import {InputPlaylist, InputTrack, Song} from "@Queue/Song";
import {DurationUtils} from "@Managers/DurationUtils";
import {Music} from "@db/Config.json";
import {Colors} from "discord.js";
import {FFspace} from "@FFspace";
import {env} from "@env";

//Поддерживаемые платформы
export type platform = "YOUTUBE" | "SPOTIFY" | "VK" | "SOUNDCLOUD" | "DISCORD" | "YANDEX";
//Поддерживаемые тип для этих платформ
export type callback = "track" | "playlist" | "search" | "album";

/*
Для добавления поддержки других платформ надо указать как получать данные в {Platforms}
Доступные типы запросов {callback}, доступные платформы {platform}
Если при указывании новой платформы с нее невозможно получать треки добавить в {PlatformsAudio}
 */
//====================== ====================== ====================== ======================
/**
 * @description Платформы которые нельзя использовать из-за ошибок авторизации
 */
const RegisterPlatform: platform[] = [];
//Проверяем наличие данных авторизации
(() => {
    if (!env.get("SPOTIFY_ID") || !env.get("SPOTIFY_SECRET")) RegisterPlatform.push("SPOTIFY");
    if (!env.get("VK_TOKEN")) RegisterPlatform.push("VK");
})();
//====================== ====================== ====================== ======================
/**
 * @description Платформы на которых недоступно получение музыки
**/
const PlatformsAudio = ["SPOTIFY", "YANDEX"];
//====================== ====================== ====================== ======================
/**
 * @description Список всех доступных платформ
**/
//Все возможные запросы данных в JSON формате
const Platforms = {
    //Какие данные можно взять с YouTube
    "YOUTUBE": {
        "color": 0xed4245,
        "prefix": ["yt", "ytb"],
        "reg": /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi,

        //Доступные запросы для этой платформы
        "callbacks": {
            "track": YouTube.getVideo,
            "playlist": YouTube.getPlaylist,
            "search": YouTube.SearchVideos
        }
    },
    //Какие данные можно взять с Spotify
    "SPOTIFY": {
        "color": 1420288,
        "prefix": ["sp"],
        "reg": /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi,

        //Доступные запросы для этой платформы
        "callbacks": {
            "track": Spotify.getTrack,
            "playlist": Spotify.getPlaylist,
            "album": Spotify.getAlbum,
            "search": Spotify.SearchTracks
        }
    },
    //Какие данные можно взять с Soundcloud
    "SOUNDCLOUD": {
        "color": 0xe67e22,
        "prefix": ["sc"],
        "reg": /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi,

        //Доступные запросы для этой платформы
        "callbacks": {
            "track": SoundCloud.getTrack,
            "playlist": SoundCloud.getPlaylist,
            "album": SoundCloud.getPlaylist,
            "search": SoundCloud.SearchTracks
        }
    },
    //Какие данные можно взять с VK
    "VK": {
        "color": 30719,
        "prefix": ["vk"],
        "reg": /vk.com/gi,

        //Доступные запросы для этой платформы
        "callbacks": {
            "track": VK.getTrack,
            "playlist": VK.getPlaylist,
            "search": VK.SearchTracks
        }
    },
    //Какие данные можно взять с Yandex music
    "YANDEX": {
        "color": Colors.Yellow,
        "prefix": ["ym", "yandex"],
        "reg": /music.yandex.ru/gi,

        //Доступные запросы для этой платформы
        "callbacks": {
            "track": YandexMusic.getTrack,
            "album": YandexMusic.getAlbum,
            "search": YandexMusic.SearchTracks
        }
    },
    //Какие данные можно взять с Discord
    "DISCORD": {
        "color": Colors.Grey,
        "reg": /cdn.discordapp.com/gi,

        //Доступные запросы для этой платформы
        "callbacks": {
            "track": (url: string): Promise<InputTrack> => FFspace.FFprobe(url).then((trackInfo: any) => {
                //Если не найдена звуковая дорожка
                if (!trackInfo) return null;

                return {
                    url, author: null, image: {url: Music.images._image},
                    title: url.split("/").pop(),
                    duration: {seconds: trackInfo.format.duration},
                    format: {url: trackInfo.format.filename}
                };
            })
        }
    }
};

/**
 * @description Набор функций для получения данных из {Platforms, RegisterPlatform}
 */
export namespace platformSupporter {
    /**
     * @description Получаем цвет трека
     * @param platform {platform} Платформа
     */
    export function getColor(platform: platform) { return Platforms[platform].color; }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем платформы с которых невозможно включить треки
     * @param platform {platform} Платформа
     */
    export function getFailPlatform(platform: platform): boolean { return RegisterPlatform.includes(platform); }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем функцию в зависимости от типа платформы и запроса
     * @param platform {platform} Платформа
     * @param type {callback} Тип запроса
     */
    export function getCallback(platform: platform, type: callback = "track") {
        const plt = Platforms[platform]["callbacks"];

        if (!plt) return "!platform";

        // @ts-ignore
        const clb = plt[type] as (str: string) => Promise<InputTrack | InputPlaylist | InputTrack[]>;

        if (!clb) return "!callback";

        return clb;
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем тип запроса
     * @param str {string} Ссылка
     */
    export function getTypeSong(str: string) {
        //Если нет str, значит пользователь прикрепил файл
        if (!str) return "track";

        //Если str является ссылкой
        if (str.match(/^(https?:\/\/)/gi)) {
            if (str.match(/playlist/)) return "playlist";
            else if ((str.match(/album/) || str.match(/sets/)) && !str.match(/track/)) return "album";
            return "track";
        }
        return "search";
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем название платформы
     * @param str {string} Ссылка
     */
    export function getPlatform(str: string): platform {
        try {
            const filterPlatforms = Object.entries(Platforms).filter(([, value]) => str.match(value.reg));
            const [key] = filterPlatforms[0];

            if (key) return key.toUpperCase() as platform;
            return "DISCORD";
        } catch (e) { return "DISCORD"; }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем аргумент для Platform<callbacks>
     * @param str {string} Строка или ссылка
     * @param platform {platform} Платформа
     */
    export function getArg(str: string, platform: platform) {
        //Если нет search, значит пользователь прикрепил файл
        if (!str) return str;

        //Если пользователь ищет трек по ссылке
        if (str.match(/^(https?:\/\/)/gi)) return str;

        //Если пользователь ищет трек по названию
        const spSearch = str.split(' '), pl = spSearch[0].toLowerCase();
        // @ts-ignore
        const aliases = pl === platform.toLowerCase() || Platforms[platform].prefix.includes(pl);

        //Если пользователь ищет трек с префиксом платформы
        if (aliases) {
            spSearch.splice(0, 1);

            return spSearch.join(" ");
        }
        return str;
    }
}
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Набор функций для поиска ссылки на исходный ресурс если что-то пошло не так
 */
export namespace SongFinder {
    /**
     * @description Получаем данные о треке заново
     * @param song {Song} Трек который надо найти по новой
     */
    export function getLinkResource(song: Song): Promise<string> {
        const {platform, url, author, title, duration} = song;

        if (PlatformsAudio.includes(platform)) return FindTrack(`${author.title} - ${title} (Lyrics)`, duration.seconds);

        const callback = platformSupporter.getCallback(platform);

        if (callback === "!platform" || callback === "!callback") return null;

        return callback(url).then((track: InputTrack) => track?.format?.url);
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Ищем трек на YouTube, если невозможно получить данные другим путем
     * @param nameSong {string} Название трека
     * @param duration {number} Длительность трека
     * @constructor
     * @private
     */
    function FindTrack(nameSong: string, duration: number): Promise<string> {
        return YouTube.SearchVideos(nameSong, {limit: 20}).then((Tracks) => {
            //Фильтруем треки оп времени
            const FindTracks: InputTrack[] = Tracks.filter((track: InputTrack) => {
                const DurationSong = DurationUtils.ParsingTimeToNumber(track.duration.seconds);

                //Как надо фильтровать треки
                return DurationSong === duration || DurationSong < duration + 7 && DurationSong > duration - 5;
            });

            //Если треков нет
            if (FindTracks?.length < 1) return null;

            //Получаем данные о треке
            return YouTube.getVideo(FindTracks[0].url).then((video) => video?.format?.url) as Promise<string>;
        });
    }
}