import {Command, ResolveData} from "../../../Structures/Handle/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ClientMessage} from "../../Events/Activity/interactionCreate";

export class Radio extends Command {
    public constructor() {
        super({
            name: "radio",
            aliases: ["rm"],
            description: "Режим радио!",

            permissions: {
                user: ["Administrator"],
                client: ["Speak", "Connect"]
            },

            isEnable: true,
            isSlash: true
        });
    };

    public readonly run = async (message: ClientMessage): Promise<ResolveData> => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если нет очереди
        if (!queue) return { text: `${message.author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };

        queue.options.radioMode = !queue.options.radioMode;

        return { text: `${message.author}, 📻 | RadioMode: ${queue.options.radioMode}`, color: "Green" };
    };
}