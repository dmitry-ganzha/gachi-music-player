import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {Voice} from "../../Core/Player/Structures/Voice";

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

    public readonly run = (message: ClientMessage): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если есть очередь то
        if (queue) {
            Voice.Disconnect(message.guild.id);
            queue.songs = [];
            queue.emitter.emit('DeleteQueue', message, true);
            return;
        }

        try {
            Voice.Disconnect(message.guild.id);
            return message.client.Send({text: `${message.author}, 👌`, message: message});
        } catch { //Если что-то пошло не так
            return message.client.Send({text: `${message.author}, 🤔`, message: message});
        }
    };
}