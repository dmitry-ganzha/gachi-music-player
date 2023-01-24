"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Replay = void 0;
const Command_1 = require("@Structures/Handle/Command");
class Command_Replay extends Command_1.Command {
    constructor() {
        super({
            name: "replay",
            aliases: ['repl'],
            description: "Повторить текущий трек?",
            isEnable: true,
            isSlash: true
        });
    }
    ;
    run = (message) => {
        const { author, member, guild, client } = message;
        const queue = client.queue.get(guild.id);
        if (!member?.voice?.channel || !member?.voice)
            return { text: `${author}, Подключись к голосовому каналу!`, color: "DarkRed" };
        if (queue && queue.voice && member?.voice?.channel?.id !== queue.voice.id)
            return {
                text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
                color: "DarkRed"
            };
        if (queue.options.radioMode)
            return { text: `${author}, Невозможно из-за включенного режима радио!`, color: "DarkRed" };
        if (!queue)
            return { text: `${author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };
        return void client.player.replay(message);
    };
}
exports.Command_Replay = Command_Replay;
