import {Command, ResolveData} from "../../../Structures/Handle/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ClientMessage} from "../../Events/Activity/interactionCreate";

export class Stop extends Command {
    public constructor() {
        super({
            name: "stop",
            aliases: ["leave", "disconnect", "discon"],
            description: "Завершаем воспроизведение музыки!",

            isEnable: true,
            isSlash: true
        });
    };

    public readonly run = async (message: ClientMessage): Promise<ResolveData> => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если есть очередь то
        if (queue) queue.cleanup();

        try {
            return {text: `${message.author}, 👌`};
        } catch { //Если что-то пошло не так
            return {text: `${message.author}, 🤔`};
        }
    };
}