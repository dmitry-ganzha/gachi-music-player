import {ConstFormat, Song} from "../Structures/Queue/Song";
import {httpsClient, httpsClientOptions} from "../../httpsClient";
import {InputFormat, InputTrack} from "../../Utils/TypeHelper";
import {SoundCloud, VK, YouTube} from "../../Platforms";

const GlobalOptions: httpsClientOptions = {request: {maxRedirections: 10, method: "GET"}, options: {RealisticRequest: true}};

//====================== ====================== ====================== ======================
/**
 * @description Заготавливаем необходимые данные для создания потока
 */
export async function FindResource(song: Song, req: number = 0): Promise<void> {
    if (req > 7) {
        song.format.work = false;
        return;
    }

    if (!song.format || !song.format.url) {
        let format = await getLinkFormat(song);
        if (!format || !format?.url) return FindResource(song, req++);


        //Подгоняем под общую сетку
        song.format = ConstFormat(format);

        //Проверяем можно ли скачивать с ресурса
        const resource = await httpsClient.Request(song.format?.url, GlobalOptions);

        if (resource instanceof Error) {
            delete song.format;
            return FindResource(song, req++);
        }

        if (resource?.statusCode === 200) {
            song.format.work = true;
            return;
        }
        //Если этот формат невозможно включить прогоняем по новой
        if (resource?.statusCode >= 400 && resource?.statusCode <= 500) return FindResource(song, req++);
    } else {
        const resource = await httpsClient.Request(song.format?.url, GlobalOptions);

        if (resource instanceof Error) {
            delete song.format;
            return FindResource(song, req++);
        }

        if (resource.statusCode >= 200 && resource.statusCode < 400) song.format.work = true;
        else {
            delete song.format;
            return FindResource(song, req++);
        }
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем данные формата
 * @param song {Song} Трек
 */
async function getLinkFormat({type, url, title, author}: Song): Promise<InputFormat> {
    try {
        if (type === "SPOTIFY") return FindTrack(`${author.title} - ${title}`);
        else if (type === "VK") return (await VK.getTrack(url))?.format;
        else if (type === "SOUNDCLOUD") return (await SoundCloud.getTrack(url))?.format;
        return getFormatYouTube(url);
    } catch {
        console.log('[FindResource]: [Fail to found format!]');
        return null;
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Ищем трек на youtube
 * @param nameSong {string} Название музыки
 * @constructor
 */
async function FindTrack(nameSong: string): Promise<InputFormat> {
    const Song = await YouTube.SearchVideos(nameSong) as InputTrack[];
    return getFormatYouTube(Song[0].url);
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем от видео аудио формат
 * @param url {string} Ссылка
 */
function getFormatYouTube(url: string): Promise<InputFormat> {
    return YouTube.getVideo(url, {onlyFormats: true}) as Promise<InputFormat>;
}