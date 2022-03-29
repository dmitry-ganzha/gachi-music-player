import {FullTimeSongs} from "../../../Manager/Functions/FullTimeSongs";
import {Song} from "../../../Manager/Queue/Structures/Song";
import {Queue} from "../../../Manager/Queue/Structures/Queue";
import {EmbedConstructor, wClient} from "../../../../../../Core/Utils/TypesHelper";
import {NotFound, NotImage, NotVer, Ver} from "./Helper";

/**
 * @description Embed сообщение о добавленном треке
 * @param client {wClient} Клиент
 * @param color {Song<color>} Цвет
 * @param author {Song<author>} Автор трека
 * @param image {Song<image>} Картинка трека
 * @param title {Song<title>} Название трека
 * @param url {Song<url>} Ссылка на трек
 * @param duration {Song<duration>} Длительность трека
 * @param requester {Song<requester>} Кто включил трек
 * @param songs {Queue<songs>} Все треки
 */
export async function AddSong(client: wClient, {color, author, image, title, url, duration, requester}: Song, {songs}: Queue): Promise<EmbedConstructor> {
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