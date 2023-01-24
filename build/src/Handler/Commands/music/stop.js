"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Stop = void 0;
const Command_1 = require("@Structures/Handle/Command");
class Command_Stop extends Command_1.Command {
    constructor() {
        super({
            name: "stop",
            aliases: ["end"],
            description: "Удаление музыкальной очереди!",
            isEnable: true,
            isSlash: true
        });
    }
    ;
    run = (message) => {
        const { author, guild, member } = message;
        const queue = message.client.queue.get(guild.id);
        if (!queue)
            return { text: `${author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };
        if (queue.voice && member?.voice?.channel?.id !== queue.voice.id)
            return {
                text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`, color: "DarkRed"
            };
        if (queue.options.radioMode)
            return { text: `${author}, Невозможно из-за включенного режима радио!`, color: "DarkRed" };
        queue.cleanup();
        return { text: `${author}, музыкальная очередь удалена!` };
    };
}
exports.Command_Stop = Command_Stop;
