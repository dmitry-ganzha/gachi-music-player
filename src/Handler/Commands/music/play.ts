import {Command, ResolveData} from "@Structures/Handle/Command";
import {ClientMessage} from "@Client/interactionCreate";
import {ApplicationCommandOptionType} from "discord.js";
import {Handle} from "@Structures/Handle/Handle";
import {Queue} from "@Queue/Queue";

export class Play extends Command {
    public constructor() {
        super({
            name: "play",
            aliases: ["p", "playing", "з"],
            description: "Включение музыки по ссылке или названию, можно прикрепить свой файл!",
            usage: "name song | url song | platform name song",

            permissions: {client: ["Speak", "Connect"], user: []},
            options: [
                {
                    name: "parameter",
                    description: "Название трека, ссылку на трек или тип yt, sp, sc, vk!",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: "search",
                    description: "Прошлый аргумент должен быть тип, теперь укажи название трека!",
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ],

            isEnable: true,
            isSlash: true,

            isCLD: 8
        });
    };

    public readonly run = (message: ClientMessage, args: string[]): ResolveData => {
        const {author, member, guild, client} = message;
        const queue: Queue = client.queue.get(guild.id);
        const search: string = args.join(" ") ?? message.attachments?.last()?.url;

        //Если пользователь не подключен к голосовым каналам
        if (!member?.voice?.channel || !member?.voice) return { text: `${author}, Подключись к голосовому каналу!`, color: "DarkRed" };

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && member?.voice?.channel?.id !== queue.voice.id) return {
            text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            color: "DarkRed"
        };

        //Если пользователь не указал аргумент
        if (!search) return { text: `${author}, Укажи ссылку, название или прикрепи файл!`, color: "DarkRed" };

        try {
            Handle.toPlayer({message, voiceChannel: member?.voice.channel, search});
        } catch (e) {
            return { text: `Произошла ошибка -> ${search}\n${e}`, color: "DarkRed", codeBlock: "css" };
        }
    };
}