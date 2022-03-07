import {AsyncFullTimeSongs} from "../../../Manager/Functions/FullTimeSongs";
import {Song} from "../../../Manager/Queue/Structures/Song";
import {Queue} from "../../../Manager/Queue/Structures/Queue";
import {EmbedConstructor, wClient} from "../../../../../../Core/Utils/TypesHelper";
import {NotFound, NotImage, NotVer, Ver} from "./Helper";

export async function Warning(client: wClient, {color, author, image, title, url, duration, requester}: Song, {songs}: Queue, err: Error): Promise<EmbedConstructor> {
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
            text: `${requester.username} | ${await AsyncFullTimeSongs(songs)} | 🎶: ${songs.length}`,
            iconURL: requester.displayAvatarURL() ? requester.displayAvatarURL() : client.user.displayAvatarURL(),
        }
    }
}