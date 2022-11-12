import {Command} from "../../../Structures/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ClientMessage} from "../../Events/Activity/Message";

export class Stop extends Command {
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
        if (queue) return queue.cleanup(true);

        try {
            return message.client.sendMessage({text: `${message.author}, 👌`, message: message});
        } catch { //Если что-то пошло не так
            return message.client.sendMessage({text: `${message.author}, 🤔`, message: message});
        }
    };
}