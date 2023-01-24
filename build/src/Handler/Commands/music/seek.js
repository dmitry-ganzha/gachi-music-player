"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Seek = void 0;
const Command_1 = require("@Structures/Handle/Command");
const discord_js_1 = require("discord.js");
class Command_Seek extends Command_1.Command {
    constructor() {
        super({
            name: "seek",
            aliases: ['begin', 'sek', 'beg'],
            description: "Пропуск времени в текущем треке!",
            usage: "00:00 | 20",
            options: [{
                    name: "value",
                    description: "Пример - 00:00",
                    required: true,
                    type: discord_js_1.ApplicationCommandOptionType.String
                }],
            isEnable: true,
            isSlash: true,
            isCLD: 10
        });
    }
    ;
    run = (message, args) => {
        const { author, member, guild, client } = message;
        const queue = client.queue.get(guild.id);
        const ArgDuration = args.join(" ").split(":");
        let EndDuration;
        if (!queue)
            return { text: `${author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };
        if (!member?.voice?.channel || !member?.voice)
            return {
                text: `${author}, Подключись к голосовому каналу!`,
                color: "DarkRed"
            };
        if (queue && queue.voice && member?.voice?.channel?.id !== queue.voice.id)
            return {
                text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
                color: "DarkRed"
            };
        if (queue.options.radioMode)
            return { text: `${author}, Невозможно из-за включенного режима радио!`, color: "DarkRed" };
        if (queue.song.isLive)
            return { text: `${author}, А как? Это же стрим!`, color: "DarkRed" };
        if (!ArgDuration)
            return { text: `${author}, Укажи время, пример 00:00:00!`, color: "DarkRed" };
        else if (ArgDuration.length > 1) {
            if (!ArgDuration[2])
                EndDuration = (ArgDuration[0] * 60) + (ArgDuration[1] % 60000);
            else
                EndDuration = (ArgDuration[0] * 60 * 60) + (ArgDuration[1] * 60) + (ArgDuration[2] % 60000);
        }
        else
            EndDuration = parseInt(args[0]);
        if (isNaN(EndDuration))
            return {
                text: `${author}, Я не могу определить что ты написал, попробуй еще раз!`,
                color: "DarkRed"
            };
        if (EndDuration > queue.song.duration.seconds)
            return { text: `${author}, Ты указал слишком много времени!`, color: "DarkRed" };
        return void client.player.seek(message, EndDuration);
    };
}
exports.Command_Seek = Command_Seek;
