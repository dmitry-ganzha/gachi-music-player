import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";

export class CommandReplay extends Command {
    public constructor() {
        super({
            name: "replay",
            aliases: ['repl'],
            description: "Повтор текущей музыки",

            enable: true,
            slash: true
        })
    };

    public run = (message: ClientMessage): void | boolean => {
        const queue = message.client.queue.get(message.guild.id);

        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: 'RED'
        });

        if (!queue) return message.client.Send({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: 'RED'
        });

        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: 'RED'
        });

        return void message.client.player.emit('replay', message);
    };
}