import {VoiceManager} from "../../Modules/Music/src/Manager/Voice/Voice";
import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";

export default class CommandStop extends Command {
    constructor() {
        super({
            name: "stop",
            aliases: ["leave", "disconnect", "discon"],
            description: "Выключение музыки",

            enable: true
        })
    };

    public run = async (message: W_Message): Promise<void> => {
        this.DeleteMessage(message, 5e3);
        const queue: Queue = message.client.queue.get(message.guild.id);
        if (queue) {
            queue.songs = [];
            queue.events.queue.emit('DestroyQueue', queue, message);
            return;
        }
        try {
            new VoiceManager().Disconnect(message.guild.id);
            return message.client.Send({text: `${message.author}, 👌`, message: message});
        } catch (e) {
            return message.client.Send({text: `${message.author}, 🤔`, message: message});
        }
    };
}