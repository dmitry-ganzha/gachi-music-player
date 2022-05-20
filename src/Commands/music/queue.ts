import {Command} from "../Constructor";
import {ReactionCollector} from "discord.js";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {CollectorSortReaction} from "../../Core/Utils/ReactionMenu";
import {FullTimeSongs} from "../../Core/Player/Manager/Duration/FullTimeSongs";
import {Song} from "../../Core/Player/Structures/Queue/Song";

export class CommandQueue extends Command {
    public constructor() {
        super({
            name: "queue",
            aliases: ["queue", "list", "musiclist"],
            description: "Показать всю музыку добавленную в очередь этого сервера?",

            enable: true,
            slash: true
        })
    };

    public run = (message: ClientMessage): Promise<ReactionCollector> | void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!queue) return message.client.Send({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: 'RED'
        });

        let pages: string[] = [], page = 1, TrackNumber = 1

        // @ts-ignore
        queue.songs.ArraySort(10).forEach((songs: Song[]) => {
            let song = songs.map((song: Song) => {
                const Duration = song.duration.StringTime;
                const TitleSong = message.client.ConvertedText(song.title, 80, true).replace(/[\s",']/g, ' ');

                return `[${TrackNumber++}] - [${Duration}] | ${TitleSong}`;
            }).join("\n");
            if (song !== undefined) pages.push(song);
        });

        return new CollectorSortReaction()._run(`\`\`\`css\n➡️ | Current playing [${queue.songs[0].title}]\n\n${pages[page - 1]}\n\n${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}\`\`\``, pages, page, message, true);
    };
}