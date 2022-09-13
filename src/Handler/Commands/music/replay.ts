import {Command} from "../../../Structures/Command";
import {ClientMessage} from "../../Events/Activity/Message";

export default class Replay extends Command {
    public constructor() {
        super({
            name: "replay",
            aliases: ['repl'],
            description: "Повторить текущий трек?",

            enable: true,
            slash: true
        })
    };

    public readonly run = (message: ClientMessage): void => {
        const queue = message.client.queue.get(message.guild.id);

        //Если пользователь не подключен к голосовым каналам
        if (!message.member.voice.channel || !message.member.voice) return message.client.sendMessage({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "DarkRed"
        });

        //Если нет очереди
        if (!queue) return message.client.sendMessage({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "DarkRed"
        });

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.sendMessage({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: "DarkRed"
        });

        return void message.client.player.emit("replay", message);
    };
}