import {Command, messageUtils} from "../../../Structures/Handle/Command";
import {ClientMessage} from "../../Events/Activity/interactiveCreate";

export class Replay extends Command {
    public constructor() {
        super({
            name: "replay",
            aliases: ['repl'],
            description: "Повторить текущий трек?",

            isEnable: true,
            isSlash: true
        });
    };

    public readonly run = (message: ClientMessage): void => {
        const queue = message.client.queue.get(message.guild.id);

        //Если пользователь не подключен к голосовым каналам
        if (!message.member?.voice?.channel || !message.member?.voice) return messageUtils.sendMessage({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "DarkRed"
        });

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && message.member?.voice?.channel?.id !== queue.voice.id) return messageUtils.sendMessage({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            message,
            color: "DarkRed"
        });

        //Если нет очереди
        if (!queue) return messageUtils.sendMessage({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "DarkRed"
        });

        return void message.client.player.emit("replay", message);
    };
}