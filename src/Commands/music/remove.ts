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

    public run = (message: ClientMessage, args: string[]): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        const argsNum = args[0] ? parseInt(args[0]) : 1;


        if (!queue) return message.client.Send({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "RED"
        });

        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: "RED"
        });

        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "RED"
        });

        if (isNaN(argsNum)) return message.client.Send({
            text: `${message.author}, Это не число!`,
            message,
            color: "RED"
        });

        if (argsNum > queue.songs.length) return message.client.Send({
            text: `${message.author}, Я не могу убрать музыку, поскольку всего ${queue.songs.length}!`,
            message,
            color: "RED"
        });

        return void message.client.player.emit("remove", message, argsNum);
    };
}