import {FullTimeSongs} from "../../Manager/Functions/FullTimeSongs";
import {Song} from "../../Queue/Structures/Song";
import {Queue} from "../../Queue/Structures/Queue";
import {NotFound, NotImage, NotVer, Ver} from "./Helper";
import {WatKLOK} from "../../../Client";
import {EmbedConstructor} from "../../../Utils/TypeHelper";

/**
 * @description Embed сообщение о добавленном треке
 * @param client {WatKLOK} Клиент
 * @param color {Song<color>} Цвет
 * @param author {Song<author>} Автор трека
 * @param image {Song<image>} Картинка трека
 * @param title {Song<title>} Название трека
 * @param url {Song<url>} Ссылка на трек
 * @param duration {Song<duration>} Длительность трека
 * @param requester {Song<requester>} Кто включил трек
 * @param songs {Queue<songs>} Все треки
 */
export function AddSong(client: WatKLOK, {color, author, image, title, url, duration, requester}: Song, {songs}: Queue): EmbedConstructor {
    return {
        color,
        author: {
            name: client.ConvertedText(author.title, 45, false),
            iconURL: author.isVerified === undefined ? NotFound : author.isVerified ? Ver : NotVer,
            url: author.url,
        },
        thumbnail: {
            url: !image?.url ? author?.image.url : image?.url ?? NotImage,
        },
        fields: [{
            name: `Добавлено`,
            value: `**❯** [${client.ConvertedText(title, 40, true)}](${url}})\n**❯** [${duration.StringTime}]`
        }],
        //timestamp: new Date(),
        footer: {
            text: `${requester.username} | ${FullTimeSongs(songs)} | 🎶: ${songs.length}`,
            iconURL: requester.displayAvatarURL(),
        }
    }
}