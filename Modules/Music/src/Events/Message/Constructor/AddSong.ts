import {FullTimeSongs} from "../../../Manager/Functions/FullTimeSongs";
import {Song} from "../../../Manager/Queue/Structures/Song";
import {Queue} from "../../../Manager/Queue/Structures/Queue";
import {EmbedConstructor, wClient} from "../../../../../../Core/Utils/TypesHelper";
import {NotFound, NotImage, NotVer, Ver} from "./Helper";

export async function AddSong(client: wClient, {color, author, image, title, url, duration, requester}: Song, {songs}: Queue): Promise<EmbedConstructor> {
    return {
        color: color,
        author: {
            name: client.ConvertedText(author.title, 45, false),
            iconURL: author.isVerified === undefined ? NotFound : author.isVerified ? Ver : NotVer,
            url: author.url,
        },
        thumbnail: {
            url: !image?.url ? author?.url : image?.url ?? NotImage,
        },
        fields: [{
            name: `Добавлено`,
            value: `**❯** [${client.ConvertedText(title, 40, true)}](${url}})\n**❯** [${duration.StringTime}]`
        }],
        timestamp: new Date() as any,
        footer: {
            text: `${requester.username} | ${FullTimeSongs(songs)} | 🎶: ${songs.length}`,
            iconURL: requester.displayAvatarURL(),
        }
    }
}