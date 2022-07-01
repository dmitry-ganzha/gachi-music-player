import {Song} from "../Queue/Song";
import {Queue} from "../Queue/Queue";
import {NotFound, NotImage, NotVer, Ver} from "./Helper";
import {WatKLOK} from "../../../Client";
import {EmbedConstructor} from "../../../Utils/TypeHelper";
import {TimeInArray} from "../../Manager/DurationUtils";

/**
 * @description Message сообщение о добавленном треке
 * @param client {WatKLOK} Клиент
 * @param color {Song<color>} Цвет
 * @param author {Song<author>} Автор трека
 * @param image {Song<image>} Картинка трека
 * @param title {Song<title>} Название трека
 * @param url {Song<url>} Ссылка на трек
 * @param duration {Song<duration>} Длительность трека
 * @param requester {Song<requester>} Кто включил трек
 * @param type {string} Платформа где была взята музыка
 * @param songs {Queue<songs>} Все треки
 * @param err {Error} Ошибка выданная плеером
 */
export function Warning(client: WatKLOK, {color, author, image, title, url, duration, requester, type}: Song, {songs}: Queue, err: Error | string): EmbedConstructor {
    return {
        color,
        description: `\n[${title}](${url})\n\`\`\`js\n${err}...\`\`\``,
        author: {
            name: client.ConvertedText(author.title, 45, false),
            iconURL: author.isVerified === undefined ? NotFound : author.isVerified ? Ver : NotVer,
            url: author.url,
        },
        thumbnail: {
            url: image?.url ?? NotImage,
        },
        timestamp: new Date(),
        footer: {
            text: `${requester.username} | ${TimeInArray(songs)} | 🎶: ${songs.length}`,
            iconURL: requester.displayAvatarURL() ? requester.displayAvatarURL() : client.user.displayAvatarURL(),
        }
    }
}