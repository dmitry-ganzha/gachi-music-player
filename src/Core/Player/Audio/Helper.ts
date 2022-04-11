import {ConstFormat, Song} from "../Structures/Queue/Song";
import {httpsClient} from "../../httpsClient";
import {InputFormat} from "../../Utils/TypeHelper";
import {SoundCloud, VK, YouTube} from "../../Platforms";

/**
 * @description Заготавливаем необходимые данные для создания потока
 */
export async function FindResource(song: Song, req: number = 0): Promise<void> {
    if (req > 25) return;

    //Получаем данные о ресурсе
    let format = await getLinkFormat(song);
    if (!format) return FindResource(song, req++);

    //Подгоняем под общую сетку
    song.format = ConstFormat(format);

    //Проверяем можно ли скачивать с ресурса
    const resource = await new httpsClient().Request(song.format?.url, {request: {maxRedirections: 10, method: "GET"}});
    if (resource?.statusCode === 200) {
        song.format.work = true;
        return;
    }
    //Если этот формат невозможно включить прогоняем по новой
    if (resource?.statusCode >= 400 && resource?.statusCode <= 500) return FindResource(song, req++);
    return;
}

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

/**
 * @description Ищем трек на youtube
 * @param nameSong {string} Название музыки
 * @constructor
 */
async function FindTrack(nameSong: string): Promise<InputFormat> {
    const Song: string = await YouTube.SearchVideos(nameSong, {onlyLink: true}) as string;
    if (Song) return getFormatYouTube(Song);
    return null;
}

/**
 * @description Получаем от видео аудио формат
 * @param url {string} Ссылка
 */
function getFormatYouTube(url: string): Promise<InputFormat> {
    return YouTube.getVideo(url, {onlyFormats: true});
}