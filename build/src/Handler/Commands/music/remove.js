"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Remove = void 0;
const Command_1 = require("@Structures/Handle/Command");
const discord_js_1 = require("discord.js");
class Command_Remove extends Command_1.Command {
    constructor() {
        super({
            name: "remove",
            aliases: [],
            description: "Эта команда удаляет из очереди музыку!",
            usage: "1 | Можно убрать любой трек из очереди | Если аргумент не указан он будет равен 1",
            options: [
                {
                    name: "value",
                    description: "Номер трека который надо удалить из очереди",
                    required: true,
                    type: discord_js_1.ApplicationCommandOptionType.String
                }
            ],
            isEnable: true,
            isSlash: true
        });
    }
    ;
    run = (message, args) => {
        const { author, member, guild, client } = message;
        const queue = client.queue.get(guild.id);
        const argsNum = args[0] ? parseInt(args[0]) : 1;
        if (!queue)
            return { text: `${author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };
        if (!member?.voice?.channel || !member?.voice)
            return { text: `${author}, Подключись к голосовому каналу!`, color: "DarkRed" };
        if (queue && queue.voice && member?.voice?.channel?.id !== queue.voice.id)
            return {
                text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
                color: "DarkRed"
            };
        if (isNaN(argsNum))
            return { text: `${author}, Это не число!`, color: "DarkRed" };
        if (argsNum > queue.songs.length)
            return { text: `${author}, Я не могу убрать музыку, поскольку всего ${queue.songs.length}!`, color: "DarkRed" };
        return void client.player.remove(message, argsNum);
    };
}
exports.Command_Remove = Command_Remove;
