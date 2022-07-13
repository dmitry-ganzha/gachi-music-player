import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {ApplicationCommandOptionType} from "discord.js";

export class CommandRemove extends Command {
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
        if (!queue) return message.client.Send({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "RED"
        });

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: "RED"
        });

        //Если пользователь не подключен к голосовым каналам
        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "RED"
        });

        //Если аргумент не число
        if (isNaN(argsNum)) return message.client.Send({
            text: `${message.author}, Это не число!`,
            message,
            color: "RED"
        });

        //Если аргумент больше кол-ва треков
        if (argsNum > queue.songs.length) return message.client.Send({
            text: `${message.author}, Я не могу убрать музыку, поскольку всего ${queue.songs.length}!`,
            message,
            color: "RED"
        });

        return void message.client.player.emit("remove", message, argsNum);
    };
}