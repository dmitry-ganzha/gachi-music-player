import {Command} from "../../../Structures/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ApplicationCommandOptionType} from "discord.js";
import {ClientMessage} from "../../Events/Activity/Message";

export default class Skip extends Command {
    public constructor() {
        super({
            name: "skip",
            aliases: ['s'],
            description: "Пропуск текущей музыки!",

            options: [{
                name: "value",
                description: "Укажите какую музыку пропускаем!",
                type: ApplicationCommandOptionType.String
            }],
            enable: true,
            slash: true
        });
    };

    public readonly run = (message: ClientMessage, args: string[]): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        const argsNum = parseInt(args[0]);

        //Если нет очереди
        if (!queue) return message.client.sendMessage({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "DarkRed"
        });

        //Если пользователь не подключен к голосовым каналам
        if (!message.member?.voice?.channel || !message.member?.voice) return message.client.sendMessage({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "DarkRed"
        });

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && message.member?.voice?.channel?.id !== queue.voice.id) return message.client.sendMessage({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            message,
            color: "DarkRed"
        });

        try {
            return void message.client.player.emit("skip", message, args && args[0] && !isNaN(argsNum) ? argsNum : null);
        } catch {
            return message.client.sendMessage({
                text: `${message.author}, Ошибка... попробуй еще раз!!!`,
                message,
                color: "DarkRed"
            });
        }
    };
}