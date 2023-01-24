"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Skip = void 0;
const Command_1 = require("@Structures/Handle/Command");
const discord_js_1 = require("discord.js");
class Command_Skip extends Command_1.Command {
    constructor() {
        super({
            name: "skip",
            aliases: ['s'],
            description: "Пропуск текущей музыки!",
            usage: "1 | Все треки будут пропущены до указанного | Если аргумент не указан, то будет пропущен текущий трек",
            options: [{
                    name: "value",
                    description: "Укажите какую музыку пропускаем!",
                    type: discord_js_1.ApplicationCommandOptionType.String
                }],
            isSlash: true,
            isEnable: true
        });
    }
    ;
    run = (message, args = ["0"]) => {
        const { author, member, guild, client } = message;
        const queue = client.queue.get(guild.id);
        const argsNum = parseInt(args[0]);
        if (!queue)
            return { text: `${author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };
        if (!member?.voice?.channel || !member?.voice)
            return { text: `${author}, Подключись к голосовому каналу!`, color: "DarkRed" };
        if (queue && queue.voice && member?.voice?.channel?.id !== queue.voice.id)
            return {
                text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
                color: "DarkRed"
            };
        try {
            return void client.player.skip(message, args && args[0] && !isNaN(argsNum) ? argsNum : null);
        }
        catch {
            return { text: `${author}, Ошибка... попробуй еще раз!!!`, color: "DarkRed" };
        }
    };
}
exports.Command_Skip = Command_Skip;
