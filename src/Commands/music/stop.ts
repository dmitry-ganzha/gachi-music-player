import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {DisconnectVoiceChannel} from "../../Core/Player/Structures/Voice";

export class CommandStop extends Command {
    public constructor() {
        super({
            name: "stop",
            aliases: ["leave", "disconnect", "discon"],
            description: "Завершаем воспроизведение музыки!",

            enable: true,
            slash: true
        });
    };

    public run = (message: ClientMessage): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        if (queue) {
            DisconnectVoiceChannel(message.guild.id);
            queue.songs = [];
            void queue.events.queue.emit("DestroyQueue", queue, message);
            return;
        }
        try {
            DisconnectVoiceChannel(message.guild.id);
            return message.client.Send({text: `${message.author}, 👌`, message: message});
        } catch {
            return message.client.Send({text: `${message.author}, 🤔`, message: message});
        }
    };
}