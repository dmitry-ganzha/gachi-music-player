import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";

export default class CommandSkip extends Command {
    constructor() {
        super({
            name: "skip",
            aliases: ['s'],
            description: "Пропуск музыки",

            enable: true,
        })
    };

    public run = async (message: W_Message, args: string[]): Promise<any> => {
        this.DeleteMessage(message, 5e3);
        let queue: Queue = message.client.queue.get(message.guild.id);

        if (!queue) return message.client.Send({text: `${message.author}, ⚠ | Музыка щас не играет.`, message: message, color: 'RED'});

        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`, message: message, color: 'RED'});

        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({text: `${message.author}, Подключись к голосовому каналу!`, message: message, color: 'RED'});

        try {
            if (args && args[0] && !isNaN(Number(args[0]))) return message.client.player.emit('skip', message, args);

            return message.client.player.emit('skip', message);
        } catch (e) {
            return message.client.Send({text: `${message.author}, Ошибка... попробуй еще раз!!!`, message: message, color: 'RED'});
        }
    };
}