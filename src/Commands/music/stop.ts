import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Queue/Structures/Queue";
import {Disconnect} from "../../Core/Player/Voice/VoiceManager";

export class CommandStop extends Command {
    public constructor() {
        super({
            name: "stop",
            aliases: ["leave", "disconnect", "discon"],
            description: "Выключение музыки",

            enable: true,
            slash: true
        })
    };

    public run = async (message: ClientMessage): Promise<void> => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        if (queue) {
            Disconnect(message.guild.id);
            queue.songs = [];
            void queue.events.queue.emit('DestroyQueue', queue, message);
            return;
        }
        try {
            Disconnect(message.guild.id);
            return message.client.Send({text: `${message.author}, 👌`, message: message});
        } catch {
            return message.client.Send({text: `${message.author}, 🤔`, message: message});
        }
    };
}