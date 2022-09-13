import {Command} from "../../../Structures/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ClientMessage} from "../../Events/Activity/Message";

export default class Resume extends Command {
    public constructor() {
        super({
            name: "resume",
            aliases: [],
            description: "Возобновить воспроизведение текущего трека?!",

            enable: true,
            slash: true
        })
    };

    public readonly run = (message: ClientMessage): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если нет очереди
        if (!queue) return message.client.sendMessage({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "DarkRed"
        });

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.sendMessage({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: "DarkRed"
        });

        //Если пользователь не подключен к голосовым каналам
        if (!message.member.voice.channel || !message.member.voice) return message.client.sendMessage({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "DarkRed"
        });

        //Если музыка уже играет
        if (queue.player.state.status === "playing") return message.client.sendMessage({
            text: `${message.author}, ⚠ Музыка щас играет.`,
            message,
            color: "DarkRed"
        });

        //Если текущий трек является потоковым
        if (queue.songs[0].isLive) return message.client.sendMessage({
            text: `${message.author}, ⚠ | Это бесполезно!`,
            message,
            color: "DarkRed"
        });

        return void message.client.player.emit("resume", message);
    };
}