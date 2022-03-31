import {Command} from "../Constructor";
import {CollectorSortReaction} from "../../Core/Utils/CollectorArraySort";
import {FullTimeSongs} from "../../Modules/Music/src/Manager/Functions/FullTimeSongs";
import {wMessage} from "../../Core/Utils/TypesHelper";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Structures/Queue";
import {ReactionCollector} from "discord.js";

export class CommandQueue extends Command {
    public constructor() {
        super({
            name: "queue",
            aliases: ["queue", "list", "musiclist"],
            description: "Плейлист сервера",

            enable: true,
            slash: true
        })
    };

    public run = async (message: wMessage): Promise<ReactionCollector | void> => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!queue) return message.client.Send({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: 'RED'
        });

        // @ts-ignore
        let pages: string[] = [], page = 1, num = 1, newSongs = queue.songs.ArraySort(10);

        newSongs.forEach((s: any[]) => {
            let i = s.map((video: any) => (
                `[${num++}]  [${video.duration.StringTime}] [${message.client.ConvertedText(video.title, 80, true).replace(/[\s",']/g, ' ')}]`
            )).join(`\n`);
            if (i !== undefined) pages.push(i);
        });

        return new CollectorSortReaction()._run(`\`\`\`css\n➡️ | Current playing [${queue.songs[0].title}]\n\n${pages[page - 1]}\n\n${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}\`\`\``, pages, page, message, true);
    };
}