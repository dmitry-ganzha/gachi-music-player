import {MessageEmbed} from "discord.js";
import {FullTimeSongs} from "../../../Manager/Functions/FullTimeSongs";
import {Song} from "../../../Manager/Queue/Constructors/Song";
import {Queue} from "../../../Manager/Queue/Constructors/Queue";
import {W_Message} from "../../../../../../Core/Utils/W_Message";

//Urls
const Ver = 'https://cdn.discordapp.com/attachments/646399394517614622/858791356628205598/Untitled.png';
const NotVer = 'https://cdn.discordapp.com/attachments/646399394517614622/858791801494437898/Untitled2.png';
const NotFound = 'https://cdn.discordapp.com/attachments/860113484493881365/916587315378388992/UntitledNotFound.png';

export class Warning extends MessageEmbed {
    constructor(message: W_Message, song: Song, queue: Queue, err: Error) {
        super({
            color: song.color as any,
            description: `\n[${song.title}](${song.url})\n\`\`\`js\n${err}...\`\`\``,
            author: {
                name: message.client.ConvertedText(song.author.title, 45, false),
                icon_url: song.author.isVerified === undefined ? NotFound : song.author.isVerified ? Ver : NotVer,
                url: song.author.url,
            },
            thumbnail: {
                url: song.thumbnails.url,
            },
            timestamp: new Date(),
            footer: {
                text: `${song.requester.username} | ${FullTimeSongs(queue)} | 🎶: ${queue.songs.length}`,
                icon_url: song.requester.displayAvatarURL() ? song.requester.displayAvatarURL() : message.client.user.displayAvatarURL(),
            }
        });
    };
}
