"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Play = void 0;
const Command_1 = require("@Structures/Handle/Command");
const discord_js_1 = require("discord.js");
const SongSupport_1 = require("@Structures/SongSupport");
class Command_Play extends Command_1.Command {
    constructor() {
        super({
            name: "play",
            aliases: ["p", "playing", "з"],
            description: "Включение музыки по ссылке или названию, можно прикрепить свой файл!",
            usage: "name song | url song | platform name song",
            permissions: { client: ["Speak", "Connect"], user: [] },
            options: [
                {
                    name: "parameter",
                    description: "Название трека, ссылку на трек или тип yt, sp, sc, vk!",
                    required: true,
                    type: discord_js_1.ApplicationCommandOptionType.String
                },
                {
                    name: "search",
                    description: "Прошлый аргумент должен быть тип, теперь укажи название трека!",
                    required: false,
                    type: discord_js_1.ApplicationCommandOptionType.String
                }
            ],
            isEnable: true,
            isSlash: true,
            isCLD: 8
        });
    }
    ;
    run = (message, args) => {
        const { author, member, guild, client } = message;
        const queue = client.queue.get(guild.id);
        const search = args.join(" ") ?? message.attachments?.last()?.url;
        const voiceChannel = member?.voice;
        if (!voiceChannel?.channel || !voiceChannel)
            return { text: `${author}, Подключись к голосовому каналу!`, color: "DarkRed" };
        if (queue && queue.voice && voiceChannel?.channel?.id !== queue.voice.id)
            return {
                text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
                color: "DarkRed"
            };
        if (!search)
            return { text: `${author}, Укажи ссылку, название или прикрепи файл!`, color: "DarkRed" };
        try {
            SongSupport_1.toPlayer.play(message, search);
        }
        catch (e) {
            return { text: `Произошла ошибка -> ${search}\n${e}`, color: "DarkRed", codeBlock: "css" };
        }
    };
}
exports.Command_Play = Command_Play;
