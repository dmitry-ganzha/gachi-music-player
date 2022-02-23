import {Command} from "../Constructor";
import {wMessage} from "../../Core/Utils/TypesHelper";
import {TextChannel} from "discord.js";

export class CommandDelete extends Command {
    public constructor() {
        super({
            name: 'delete',

            enable: true,
            isOwner: true,
            slash: false
        })
    };
    public run = async (message: wMessage, args: string[]): Promise<void> => {

        if (!args[0]) return message.client.Send({text: `${message.author}, Укажи ID канала!`, message, color: "RED"});

        if (!args[1]) return message.client.Send({text: `${message.author}, Укажи ID сообщения!`, message, color: "RED"});

        try {
            (message.client.channels.cache.get(args[0] || message.channel.id) as TextChannel).messages.fetch(args[1]).then(msg => msg.delete());
        } catch {
            return message.client.Send({text: `${message.author}, Я не смог удалить это сообщение!`, message, color: "RED"});
        }
        return message.client.Send({text: `${message.author}, Сообщение ${args[0]} было удалено!`, message, color: "GREEN"});
    };
}