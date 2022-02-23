import {VoiceManager} from "../../Modules/Music/src/Manager/Voice/Voice";
import {Command} from "../Constructor";
import {wMessage} from "../../Core/Utils/TypesHelper";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Structures/Queue";

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

    public run = async (message: wMessage): Promise<void> => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        if (queue) {
            queue.songs = [];
            void queue.events.queue.emit('DestroyQueue', queue, message);
            return;
        }
        try {
            new VoiceManager().Disconnect(message.guild.id);
            return message.client.Send({text: `${message.author}, 👌`, message: message});
        } catch {
            return message.client.Send({text: `${message.author}, 🤔`, message: message});
        }
    };
}