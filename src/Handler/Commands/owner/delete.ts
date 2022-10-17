import {Command} from "../../../Structures/Command";
import {ClientMessage} from "../../Events/Activity/Message";
import {TextChannel} from "discord.js";

export default class Delete extends Command {
    public constructor() {
        super({
            name: "delete",

            enable: true,
            isOwner: true,
            slash: false
        })
    };

    public readonly run = (message: ClientMessage, args: string[]): void => {
        //Если нет ID канала
        if (!args[0]) return message.client.sendMessage({
            text: `${message.author}, Укажи ID канала!`,
            message,
            color: "DarkRed"
        });

        //Если нет ID сообщения
        if (!args[1]) return message.client.sendMessage({
            text: `${message.author}, Укажи ID сообщения!`,
            message,
            color: "DarkRed"
        });

        //Ищем сообщение
        try {
            (message.client.channels.cache.get(args[0] || message.channel.id) as TextChannel).messages.fetch(args[1]).then(msg => msg.delete());
        } catch {
            return message.client.sendMessage({
                text: `${message.author}, Я не смог удалить это сообщение!`,
                message,
                color: "DarkRed"
            });
        }

        return message.client.sendMessage({
            text: `${message.author}, Сообщение ${args[0]} было удалено!`,
            message,
            color: "Green"
        });
    };
}