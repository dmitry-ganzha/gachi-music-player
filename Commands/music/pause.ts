import {Command} from "../Constructor";
import {wMessage} from "../../Core/Utils/TypesHelper";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Structures/Queue";

export class CommandPause extends Command {
    public constructor() {
        super({
            name: "pause",
            description: "Приостановка воспроизведения музыки",

            enable: true,
            slash: true
        })
    };

    public run = async (message: wMessage): Promise<void | boolean> => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!queue.player) return message.client.Send({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: 'RED'
        });

        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: 'RED'
        });

        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: 'RED'
        });

        if (queue.player.state.status === 'paused') return message.client.Send({
            text: `${message.author}, ⚠ | Музыка уже приостановлена!`,
            message,
            color: 'RED'
        });

        if (queue.songs[0].isLive) return message.client.Send({
            text: `${message.author}, ⚠ | Это бесполезно!`,
            message,
            color: 'RED'
        });

        return void message.client.player.emit("pause", message);
    };
}