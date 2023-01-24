"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Random = void 0;
const Command_1 = require("@Structures/Handle/Command");
class Command_Random extends Command_1.Command {
    constructor() {
        super({
            name: 'random',
            aliases: ["rm"],
            description: 'После каждой проигранной музыки будет выбрана случайная музыка!',
            isEnable: true,
            isSlash: true
        });
    }
    ;
    run = (message) => {
        const { author, member, guild, client } = message;
        const queue = client.queue.get(guild.id);
        if (!queue)
            return { text: `${author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };
        if (!member?.voice?.channel || !member?.voice)
            return { text: `${author}, Подключись к голосовому каналу!`, color: "DarkRed" };
        if (queue && queue.voice && member?.voice?.channel?.id !== queue.voice.id)
            return {
                text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
                color: "DarkRed"
            };
        if (queue.options.radioMode)
            return { text: `${author}, Невозможно из-за включенного режима радио!`, color: "DarkRed" };
        if (queue.songs.length <= 2)
            return { text: `${author}, Всего в списке ${queue.songs.length}, нет смысла!`, color: "DarkRed" };
        if (queue.options.random === false) {
            queue.options.random = true;
            return { text: `🔀 | Auto shuffle enable`, codeBlock: "css" };
        }
        else {
            queue.options.random = false;
            return { text: `🔀 | Auto shuffle disable`, codeBlock: "css" };
        }
    };
}
exports.Command_Random = Command_Random;
