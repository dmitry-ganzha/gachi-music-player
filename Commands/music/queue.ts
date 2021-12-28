import {Command} from "../Constructor";
import {CollectorSortReaction} from "../../Core/Utils/CollectorArraySort";
import {FullTimeSongs} from "../../Modules/Music/src/Manager/Functions/FullTimeSongs";
import {W_Message} from "../../Core/Utils/W_Message";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";

export default class CommandQueue extends Command {
    constructor() {
        super({
            name: "queue",
            aliases: ["queue", "list", "musiclist"],
            description: "Плейлист сервера",

            enable: true
        })
    };

    public run = async (message: W_Message): Promise<void> => {
        this.DeleteMessage(message, 5e3);
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!queue) return message.client.Send({ text: `${message.author}, ⚠ | Музыка щас не играет.`, message: message, color: 'RED' });

        // @ts-ignore
        let pages = [], page = 1, num = 1, newSongs = queue.songs.ArraySort(10);
        newSongs.forEach((s: any[]) => {
            let i = s.map((video: any) => (
                `[${num++}]  [${video.duration.StringTime}] [${message.client.ConvertedText(video.title, 80, true).replace(/[\s",']/g, ' ')}]`
            )).join(`\n`);
            if (i !== undefined) pages.push(i);
        });
        return new CollectorSortReaction()._run(`\`\`\`css\n➡️ | Current playing [${queue.songs[0].title}]\n\n${pages[page - 1]}\n\n${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}\`\`\``, pages, page, message, true);
    };
}