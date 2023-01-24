"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Queue = void 0;
const Command_1 = require("@Structures/Handle/Command");
const ArraySort_1 = require("@Structures/ArraySort");
const DurationUtils_1 = require("@Managers/DurationUtils");
class Command_Queue extends Command_1.Command {
    constructor() {
        super({
            name: "queue",
            aliases: ["queue", "list", "musiclist"],
            description: "Показать всю музыку добавленную в очередь этого сервера?",
            isEnable: true,
            isSlash: true
        });
    }
    ;
    run = (message) => {
        const { author, guild, client } = message;
        const queue = client.queue.get(guild.id);
        if (!queue)
            return { text: `${author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };
        const pages = (0, ArraySort_1.ArraySort)(10, queue.songs, (song, index) => {
            const Duration = song.duration.full;
            const TitleSong = Command_1.replacer.replaceText(song.title, 80, true).replace(/[\s",']/g, ' ');
            return `[${index + 1}] - [${Duration}] | ${TitleSong}`;
        });
        const CurrentPlaying = `Current playing -> [${queue.song.title}]`;
        const Footer = `${author.username} | ${DurationUtils_1.DurationUtils.getTimeQueue(queue)} | Лист 1 из ${pages.length} | Songs: ${queue.songs.length}`;
        return { embed: `\`\`\`css\n➡️ | ${CurrentPlaying}\n\n${pages[0]}\n\n${Footer}\`\`\``, callbacks: this.Callbacks(1, pages, queue) };
    };
    Callbacks = (page, pages, queue) => {
        return {
            back: ({ users }, user, message, msg) => {
                setImmediate(() => {
                    users.remove(user).catch((err) => console.log(err));
                    if (page === 1)
                        return null;
                    page--;
                    return this.EditMessage(queue, message, msg, pages, page);
                });
            },
            cancel: (reaction, user, message, msg) => {
                setImmediate(() => {
                    [msg, message].forEach((mes) => mes.deletable ? mes.delete().catch(() => null) : null);
                });
            },
            next: ({ users }, user, message, msg) => {
                setImmediate(() => {
                    users.remove(user).catch((err) => console.log(err));
                    if (page === pages.length)
                        return null;
                    page++;
                    return this.EditMessage(queue, message, msg, pages, page);
                });
            }
        };
    };
    EditMessage = (queue, message, msg, pages, page) => {
        const CurrentPlaying = `Current playing -> [${queue.song.title}]`;
        const Footer = `${message.author.username} | ${DurationUtils_1.DurationUtils.getTimeQueue(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}`;
        return msg.edit(`\`\`\`css\n➡️ | ${CurrentPlaying}\n\n${pages[page - 1]}\n\n${Footer}\`\`\``);
    };
}
exports.Command_Queue = Command_Queue;
