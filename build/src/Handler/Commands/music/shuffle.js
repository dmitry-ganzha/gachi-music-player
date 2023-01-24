"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Shuffle = void 0;
const Command_1 = require("@Structures/Handle/Command");
const discord_js_1 = require("discord.js");
class Command_Shuffle extends Command_1.Command {
    constructor() {
        super({
            name: "shuffle",
            description: "Перетасовка музыки в очереди текущего сервера!",
            options: [{
                    name: "value",
                    description: "Shuffle queue songs",
                    required: true,
                    type: discord_js_1.ApplicationCommandOptionType.String
                }],
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
        if (!queue.songs)
            return { text: `${author}, Нет музыки в очереди!`, color: "DarkRed" };
        if (queue.songs.length < 3)
            return { text: `${author}, Очень мало музыки, нужно более 3`, color: "DarkRed" };
        this.shuffleSongs(queue.songs);
        return { text: `🔀 | Shuffle total [${queue.songs.length}]`, codeBlock: "css" };
    };
    shuffleSongs = (songs) => {
        for (let i = songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songs[i], songs[j]] = [songs[j], songs[i]];
        }
    };
}
exports.Command_Shuffle = Command_Shuffle;
