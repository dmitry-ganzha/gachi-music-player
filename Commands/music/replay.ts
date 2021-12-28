import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";

export default class CommandReplay extends Command {
    constructor() {
        super({
            name: "replay",
            aliases: ['repl'],
            description: "Повтор текущей музыки",

            enable: true,
        })
    };

    public run = async (message: W_Message): Promise<any> => {
        this.DeleteMessage(message, 5e3);
        const queue = message.client.queue.get(message.guild.id);

        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({text: `${message.author}, Подключись к голосовому каналу!`, message: message, color: 'RED'});

        if (!queue) return message.client.Send({ text: `${message.author}, ⚠ | Музыка щас не играет.`, message: message, color: 'RED' });

        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`, message: message, color: 'RED'});

        return message.client.player.emit('replay', message);
    };
}