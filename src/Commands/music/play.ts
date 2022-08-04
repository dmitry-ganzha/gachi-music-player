import {Command} from "../Constructor";
import {ApplicationCommandOptionType, StageChannel, VoiceChannel} from "discord.js";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {Searcher} from "../../Core/Player/Manager/Resource/Searcher";

export default class Play extends Command {
    public constructor() {
        super({
            name: "play",
            aliases: ["p", "playing", "з"],
            description: "Включение музыки по ссылке или названию, можно прикрепить свой файл!",

            permissions: {client: ["Speak", "Connect"], user: []},
            options: [
                {
                    name: "url-name-type",
                    description: "Укажи что нужно, ссылку, название или тип поиска и название",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: "search",
                    description: "Прошлый аргумент, тип? Если да, тут название трека!",
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ],
            enable: true,
            slash: true,
            CoolDown: 8
        });
    };

    public readonly run = (message: ClientMessage, args: string[]): void => {
        const voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel;
        const queue: Queue = message.client.queue.get(message.guild.id);
        const search: string = args.join(" ");

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: "RED"
        });

        //Если пользователь не подключен к голосовым каналам
        if (!voiceChannel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "RED"
        });

        //Если пользователь не указал аргумент
        if (!search && !message.attachments?.last()?.url) return message.client.Send({
            text: `${message.author}, Укажи ссылку, название или прикрепи файл!`,
            message,
            color: "RED"
        });

        return Searcher.toPlayer({message, voiceChannel, search: args.join(" ") ?? message.attachments?.last()?.url});
    };
}