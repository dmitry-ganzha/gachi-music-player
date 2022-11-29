import {Command, ResolveData} from "../../../Structures/Handle/Command";
import {ApplicationCommandOptionType} from "discord.js";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ClientMessage} from "../../Events/Activity/interactionCreate";
import {Handle} from "../../../AudioPlayer/Structures/Handle/Handle";

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

    public readonly run = async (message: ClientMessage, args: string[]): Promise<ResolveData> => {
        const voiceMember = message.member.voice;
        const queue: Queue = message.client.queue.get(message.guild.id);
        const search: string = args.join(" ") ?? message.attachments?.last()?.url;

        //Если пользователь не подключен к голосовым каналам
        if (!message.member?.voice?.channel || !message.member?.voice) return { text: `${message.author}, Подключись к голосовому каналу!`, color: "DarkRed" };

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && message.member?.voice?.channel?.id !== queue.voice.id) return {
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            color: "DarkRed"
        };

        //Если пользователь не указал аргумент
        if (!search) return { text: `${message.author}, Укажи ссылку, название или прикрепи файл!`, color: "DarkRed" };

        try {
            Handle.toPlayer({message, voiceChannel: voiceMember.channel, search});
        } catch (e) {
            return { text: `Произошла ошибка -> ${search}\n${e}`, color: "DarkRed", codeBlock: "css" };
        }
    };
}