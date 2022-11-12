import {FileSystem} from "../../Core/FileSystem";
import {SoundCloud, Spotify, VK, YouTube} from "../../Structures/Platforms";
import {FFmpeg} from "./Media/FFmpeg";
import {Images} from "./EmbedMessages";
import {Colors} from "discord.js";
import {InputPlaylist, InputTrack, Song} from "./Queue/Song";
import {DurationUtils} from "../Managers/DurationUtils";

/*
Для добавления своей платформы нужно добавить в {supportPlatforms} и {PlatformReg}. Для получения названия платформы и данных с нее
Для добавления ее в поиск нужно добавить в {SearchPlatforms} сокращение: название платформы
Так-же можно добавить свой цвет в {ColorTrack}
Все для добавления своей поддержки разных платформ находится в этом файле
 */
export const FailRegisterPlatform: Set<supportPlatforms> = new Set();

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
export const ColorTrack = {
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
//Платформы на которых нельзя получить исходный файл музыки
const PlatformsAudio = ["SPOTIFY"];

//Поддерживаемые платформы
export type supportPlatforms = "YOUTUBE" | "SPOTIFY" | "VK" | "SOUNDCLOUD" | "DISCORD";
//Поддерживаемые тип для этих платформ
export type SupportType = "track" | "playlist" | "search" | "album";

//Выдает платформу из ссылки
export function TypePlatform(url: string): supportPlatforms {
    try {
        const filterPlatforms = Object.entries(PlatformReg).filter(([, value]) => url.match(value));
        const [key] = filterPlatforms[0];

        if (key) return key.toUpperCase() as supportPlatforms;
        return "DISCORD"; //К этому типу привязан ffprobe
    } catch (e) {
        return "DISCORD"; //К этому типу привязан ffprobe
    }
}

//Ищет исходный ресурс треков
export namespace SongFinder {
    //Получаем данные о треке заново
    export function findResource(song: Song): Promise<FFmpeg.Format> {
        const {type, url, author, title, duration} = song;

        if (PlatformsAudio.includes(type)) return FindTrack(`${author.title} - ${title} (Lyrics)`, duration.seconds);

        // @ts-ignore
        const FindPlatform = SupportPlatforms[type];
        const FindCallback = FindPlatform["track"](url);

        return FindCallback.then((track: InputTrack) => track?.format);
    }
    //Ищем трек на YouTube
    function FindTrack(nameSong: string, duration: number): Promise<FFmpeg.Format> {
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
            return YouTube.getVideo(FindTracks[0].url).then((video) => video.format) as Promise<FFmpeg.Format>;
        });
    }
}