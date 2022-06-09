import {ConstFormat, Song} from "../Structures/Queue/Song";
import {httpsClient, httpsClientOptions} from "../../httpsClient";
import {InputFormat, InputTrack} from "../../Utils/TypeHelper";
import {SoundCloud, VK, YouTube} from "../../Platforms";
import {ParserTime} from "../Manager/DurationUtils";

const GlobalOptions: httpsClientOptions = {request: {maxRedirections: 10, method: "GET"}};

//====================== ====================== ====================== ======================
/**
 * @description Заготавливаем необходимые данные для создания потока
 */
export async function FindResource(song: Song): Promise<void> {
    if (!song.format || !song.format.url) {
        let format = await getLinkFormat(song);

        if (!format || !format?.url) throw Error("Has not found format");

        //Подгоняем под общую сетку
        song.format = ConstFormat(format);

        //Проверяем можно ли скачивать с ресурса
        const resource = await httpsClient.Request(song.format?.url, GlobalOptions);

        if (resource instanceof Error) {
            delete song.format;
            throw Error(`Failed checking link resource. Code: ${resource.statusCode}`);
        }

        if (resource?.statusCode === 200) {
            song.format.work = true;
            return;
        }
        //Если этот формат невозможно включить прогоняем по новой
        if (resource?.statusCode >= 400 && resource?.statusCode <= 500) return FindResource(song);
    }

    const resource = await httpsClient.Request(song.format?.url, GlobalOptions);

    if (resource instanceof Error) {
        delete song.format;
        throw Error(`Failed checking link resource. Code: ${resource.statusCode}`);
    }

    if (resource.statusCode >= 200 && resource.statusCode < 400) song.format.work = true;
    else {
        delete song.format;
        throw Error(`Failed checking link resource. Code: ${resource.statusCode}`);
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем данные формата
 * @param song {Song} Трек
 */
function getLinkFormat({type, url, title, author, duration}: Song): Promise<InputFormat> {
    try {
        switch (type) {
            case "SPOTIFY": return FindTrack(`${author.title} - ${title}`, duration.seconds);
            case "SOUNDCLOUD": return VK.getTrack(url).then((d) => d?.format);
            case "VK": return SoundCloud.getTrack(url).then((d) => d?.format);
            case "YOUTUBE": return getFormatYouTube(url);
            default: return null
        }
    } catch {
        console.log("[FindResource]: [Fail to found format]");
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
        const FindTracks = Tracks.filter((track) => Filter(track, duration));

        if (FindTracks.length === 0) return null;

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

    return DurationSong < NeedDuration + 15 && DurationSong > NeedDuration - 15;
}