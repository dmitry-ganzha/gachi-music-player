import {Command} from "../../../Structures/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ApplicationCommandOptionType} from "discord.js";
import {ClientMessage} from "../../Events/Activity/Message";

export default class Remove extends Command {
    public constructor() {
        super({
            name: "remove",
            aliases: [],
            description: "Эта команда удаляет из очереди музыку!",

            options: [
                {
                    name: "value",
                    description: "Remove song in value",
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ],
            enable: true,
            slash: true
        })
    };

    public readonly run = (message: ClientMessage, args: string[]): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        const argsNum = args[0] ? parseInt(args[0]) : 1;

        //Если нет очереди
        if (!queue) return message.client.sendMessage({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "DarkRed"
        });

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && message.member.voice.channel.id !== queue.voice.id) return message.client.sendMessage({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            message,
            color: "DarkRed"
        });

        //Если пользователь не подключен к голосовым каналам
        if (!message.member.voice.channel || !message.member.voice) return message.client.sendMessage({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "DarkRed"
        });

        //Если аргумент не число
        if (isNaN(argsNum)) return message.client.sendMessage({
            text: `${message.author}, Это не число!`,
            message,
            color: "DarkRed"
        });

        //Если аргумент больше кол-ва треков
        if (argsNum > queue.songs.length) return message.client.sendMessage({
            text: `${message.author}, Я не могу убрать музыку, поскольку всего ${queue.songs.length}!`,
            message,
            color: "DarkRed"
        });

        return void message.client.player.emit("remove", message, argsNum);
    };
}