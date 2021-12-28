import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";

export default class CommandResume extends Command {
    constructor() {
        super({
            name: "resume",
            aliases: [],
            description: "Возобновление воиспроизведения музыки",

            enable: true,
        })
    };

    public run = async (message: W_Message): Promise<any> => {
        this.DeleteMessage(message, 5e3);
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!queue) return message.client.Send({text: `${message.author}, ⚠ | Музыка щас не играет.`, message: message, color: 'RED'});

        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`, message: message, color: 'RED'});

        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({text: `${message.author}, Подключись к голосовому каналу!`, message: message, color: 'RED'});

        if (queue.player.state.status === 'playing') return message.client.Send({text: `${message.author}, ⚠ Музыка щас играет.`, message: message, color: 'RED'});

        if (queue.songs[0].isLive) return message.client.Send({text: `${message.author}, ⚠ | Это бесполезно!`, message: message, color: 'RED'});

        return message.client.player.emit('resume', message);
    };
}