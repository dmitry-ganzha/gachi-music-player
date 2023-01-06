import {InputTrack, Song} from "@Queue/Song";
import {SoundCloud, Spotify, VK, YandexMusic, YouTube} from "@APIs";
import {DurationUtils} from "@Managers/DurationUtils";
import {Music} from "@db/Config.json";
import {Colors} from "discord.js";
import {FFspace} from "@FFspace";
import {env} from "@env";

/*
Для добавления своей платформы нужно добавить в {supportPlatforms} и {PlatformReg}. Для получения названия платформы и данных с нее
Для добавления ее в поиск нужно добавить в {SearchPlatforms} сокращение: название платформы
Так-же можно добавить свой цвет в {ColorTrack}
Все для добавления своей поддержки разных платформ находится в этом файле
 */
export const FailRegisterPlatform: Set<supportPlatforms> = new Set();

//Проверяем наличие данных авторизации
(() => {
    if (!env.get("SPOTIFY_ID") || !env.get("SPOTIFY_SECRET")) FailRegisterPlatform.add("SPOTIFY");
    if (!env.get("VK_TOKEN")) FailRegisterPlatform.add("VK");
})();

//Все возможные запросы данных в JSON формате
export const SupportPlatforms = {
    "YOUTUBE": {
        "track": YouTube.getVideo,
        "playlist": YouTube.getPlaylist,
        "search": YouTube.SearchVideos
    },
    "SPOTIFY": {
        "track": Spotify.getTrack,
        "playlist": Spotify.getPlaylist,
        "album": Spotify.getAlbum,
        "search": Spotify.SearchTracks
    },
    "SOUNDCLOUD": {
        "track": SoundCloud.getTrack,
        "playlist": SoundCloud.getPlaylist,
        "album": SoundCloud.getPlaylist,
        "search": SoundCloud.SearchTracks
    },
    "VK": {
        "track": VK.getTrack,
        "playlist": VK.getPlaylist,
        "search": VK.SearchTracks
    },
    "YANDEX": {
        "track": YandexMusic.getTrack,
        "album": YandexMusic.getAlbum,
        "search": YandexMusic.SearchTracks
    },
    "DISCORD": {
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
};
//Доступные платформы для поиска
export const SearchPlatforms = {
    "YOUTUBE": ["yt", "ytb"],
    "SPOTIFY": ["sp"],
    "SOUNDCLOUD": ["sc"],
    "VK": ["vk"],
    "YANDEX": ["ym", "yandex"]
};
//Цвета названий платформ
export const ColorTrack = {
    "YANDEX": Colors.Yellow,
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
    yandex: /music.yandex.ru/gi,
    vk: /vk.com/gi,
    discord: /cdn.discordapp.com/gi
};
//Платформы на которых нельзя получить исходный файл музыки
const PlatformsAudio = ["SPOTIFY", "YANDEX"];

//Поддерживаемые платформы
export type supportPlatforms = "YOUTUBE" | "SPOTIFY" | "VK" | "SOUNDCLOUD" | "DISCORD" | "YANDEX";
//Поддерживаемые тип для этих платформ
export type SupportType = "track" | "playlist" | "search" | "album";

//Выдает платформу из ссылки
export function TypePlatform(url: string): supportPlatforms {
    try {
        const filterPlatforms = Object.entries(PlatformReg).filter(([, value]) => url.match(value));
        const [key] = filterPlatforms[0];

        if (key) return key.toUpperCase() as supportPlatforms;
        return "DISCORD";
    } catch (e) { return "DISCORD"; }
}

//Ищет исходный ресурс треков
export namespace SongFinder {
    //Получаем данные о треке заново
    export function findResource(song: Song): Promise<string> {
        const {platform, url, author, title, duration} = song;

        if (PlatformsAudio.includes(platform)) return FindTrack(`${author.title} - ${title} (Lyrics)`, duration.seconds);

        // @ts-ignore
        const FindPlatform = SupportPlatforms[platform];
        const FindCallback = FindPlatform["track"](url);

        return FindCallback.then((track: InputTrack) => track?.format?.url);
    }
    //Ищем трек на YouTube
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