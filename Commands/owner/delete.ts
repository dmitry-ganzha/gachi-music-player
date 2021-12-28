import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";
import {TextChannel} from "discord.js";

export default class CommandDelete extends Command {
    constructor() {
        super({
            name: 'delete',

            enable: true,
            isOwner: true,
            slash: false
        })
    };
    public run = async (message: W_Message, args: string[]): Promise<void> => {

        if (!args[0]) return message.client.Send({text: `${message.author}, Укажи ID канала!`, message: message, color: "RED"});

        if (!args[1]) return message.client.Send({text: `${message.author}, Укажи ID сообщения!`, message: message, color: "RED"});

        try {
            (message.client.channels.cache.get(args[0] || message.channel.id) as TextChannel).messages.fetch(args[1]).then(msg => msg.delete());
        } catch (err) {
            return message.client.Send({text: `${message.author}, Я не смог удалить это сообщение!`, message: message, color: "RED"});
        }
        return message.client.Send({text: `${message.author}, Сообщение ${args[0]} было удалено!`, message: message, color: "GREEN"});
    };
}