import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";

export class CommandResume extends Command {
    public constructor() {
        super({
            name: "resume",
            aliases: [],
            description: "Возобновить воспроизведение текущего трека?!",

            enable: true,
            slash: true
        })
    };

    public run = (message: ClientMessage): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!queue) return message.client.Send({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "RED"
        });

        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: "RED"
        });

        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "RED"
        });

        if (queue.player.state.status === "playing") return message.client.Send({
            text: `${message.author}, ⚠ Музыка щас играет.`,
            message,
            color: "RED"
        });

        if (queue.songs[0].isLive) return message.client.Send({
            text: `${message.author}, ⚠ | Это бесполезно!`,
            message,
            color: "RED"
        });

        return void message.client.player.emit("resume", message);
    };
}