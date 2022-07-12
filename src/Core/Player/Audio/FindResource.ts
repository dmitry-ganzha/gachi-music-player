import {Song} from "../Structures/Queue/Song";
import {httpsClient, httpsClientOptions} from "../../httpsClient";
import {InputFormat, InputTrack} from "../../Utils/TypeHelper";
import {SoundCloud, VK, YouTube} from "../../Platforms";
import {ParserTime} from "../Manager/DurationUtils";

const GlobalOptions: httpsClientOptions = {request: {method: "HEAD"}};

//====================== ====================== ====================== ======================
/**
 * @description Заготавливаем необходимые данные для создания потока
 */
export function FindResource(song: Song): Promise<true | Error> {
    return new Promise(async (resolve) => {
        if (!song.format || !song.format?.url) {
            let format = await getFormatSong(song);

            if (!format || !format?.url) {
                song.format.url = null;
                return resolve(new Error(`[FindResource]: [Song: ${song.title}]: Has not found format`));
            }
            //Добавляем ссылку в трек
            song.format = {url: format.url};
        }

        //Делаем head запрос на сервер
        const resource = await CheckLink(song.format?.url);
        if (resource === "Fail") { //Если выходит ошибка
            song.format.url = null;
            return resolve(new Error(`[FindResource]: [Song: ${song.title}]: Has fail checking resource link`));
        }
        return resolve(true);
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Проверяем ссылку
 * @param url {string} Ссылка
 * @constructor
 */
function CheckLink(url: string) {
    if (!url) return "Fail";

    return httpsClient.Request(url, GlobalOptions).then((resource) => {
        if (resource instanceof Error) return "Fail"; //Если есть ошибка
        if (resource.statusCode >= 200 && resource.statusCode < 400) return "OK"; //Если возможно скачивать ресурс
        return "Fail"; //Если прошлые варианты не подходят, то эта ссылка не рабочая
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем данные формата
 * @param song {Song} Трек
 */
function getFormatSong({type, url, title, author, duration}: Song): Promise<InputFormat> {
    try {
        switch (type) {
            case "SPOTIFY": return FindTrack(`${author.title} - ${title}`, duration.seconds);
            case "SOUNDCLOUD": return VK.getTrack(url).then((d) => d?.format);
            case "VK": return SoundCloud.getTrack(url).then((d) => d?.format);
            case "YOUTUBE": return getFormatYouTube(url);
            default: return null
        }
    } catch {
        console.log("[FindResource]: Fail to found format");
        return null;
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Ищем трек на youtube
 * @param nameSong {string} Название музыки
 * @param duration
 * @constructor
 */
function FindTrack(nameSong: string, duration: number): Promise<InputFormat> {
    return YouTube.SearchVideos(nameSong).then((Tracks) => {
        //Фильтруем треки оп времени
        const FindTracks = Tracks.filter((track) => Filter(track, duration));

        //Если треков нет
        if (FindTracks.length === 0) return null;

        //Получаем данные о треке
        return getFormatYouTube(FindTracks[0].url);
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем от видео аудио формат
 * @param url {string} Ссылка
 */
function getFormatYouTube(url: string): Promise<InputFormat> {
    return YouTube.getVideo(url, {onlyFormats: true}) as Promise<InputFormat>;
}

function Filter(track: InputTrack, NeedDuration: number) {
    const DurationSong = ParserTime(track.duration.seconds);

    //Как надо фильтровать треки
    return DurationSong < NeedDuration + 15 && DurationSong > NeedDuration - 15;
}