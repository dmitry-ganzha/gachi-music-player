"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Resume = void 0;
const Command_1 = require("@Structures/Handle/Command");
class Command_Resume extends Command_1.Command {
    constructor() {
        super({
            name: "resume",
            aliases: [],
            description: "Возобновить воспроизведение текущего трека?!",
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
        if (queue.player.state.status === "read")
            return { text: `${author}, ⚠ Музыка щас играет.`, color: "DarkRed" };
        if (queue.song.isLive)
            return { text: `${author}, ⚠ | Это бесполезно!`, color: "DarkRed" };
        return void client.player.resume(message);
    };
}
exports.Command_Resume = Command_Resume;
