"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Loop = void 0;
const Command_1 = require("@Structures/Handle/Command");
const discord_js_1 = require("discord.js");
class Command_Loop extends Command_1.Command {
    constructor() {
        super({
            name: "loop",
            aliases: ["repeat", "rept"],
            description: "Включение повтора и выключение повтора музыки!",
            usage: "song | Доступны: song, songs, off",
            options: [
                {
                    name: "type",
                    description: "Необходимо указать что-то из | song, on, off",
                    type: discord_js_1.ApplicationCommandOptionType.String
                }
            ],
            isSlash: true,
            isEnable: true
        });
    }
    ;
    run = (message, args) => {
        const { author, member, guild } = message;
        const queue = message.client.queue.get(guild.id);
        if (!member?.voice?.channel || !member?.voice)
            return { text: `${author}, Подключись к голосовому каналу!`, color: "DarkRed" };
        if (queue && queue.voice && member?.voice?.channel?.id !== queue.voice.id)
            return {
                text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`, color: "DarkRed"
            };
        if (queue.options.radioMode)
            return { text: `${author}, Невозможно из-за включенного режима радио!`, color: "DarkRed" };
        if (!queue)
            return { text: `${author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };
        switch (args[0]) {
            case "выкл":
            case "off":
                queue.options.loop = "off";
                return { text: `❌ | Повтор выключен`, codeBlock: "css" };
            case "вкл":
            case "on":
                queue.options.loop = "songs";
                return { text: `🔁 | Повтор всей музыки`, codeBlock: "css" };
            case "one":
            case "1":
            case "song":
                queue.options.loop = "song";
                return { text: `🔂 | Повтор  | ${queue.songs[0].title}`, codeBlock: "css", color: queue.songs[0].color };
            default:
                queue.options.loop = queue.options.loop !== "songs" ? "songs" : "off";
                return { text: `🎶 | Повтор ${queue.options.loop}`, codeBlock: "css" };
        }
    };
}
exports.Command_Loop = Command_Loop;
