import {Command, ResolveData} from "../../../Structures/Handle/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ClientMessage} from "../../Events/Activity/interactionCreate";

export class Pause extends Command {
    public constructor() {
        super({
            name: "pause",
            description: "Приостановить воспроизведение текущего трека?!",

            isEnable: true,
            isSlash: true
        })
    };

    public readonly run = async (message: ClientMessage): Promise<ResolveData> => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если нет очереди
        if (!queue) return { text: `${message.author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };

        //Если пользователь не подключен к голосовым каналам
        if (!message.member?.voice?.channel || !message.member?.voice) return { text: `${message.author}, Подключись к голосовому каналу!`, color: "DarkRed" };

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && message.member?.voice?.channel?.id !== queue.voice.id) return {
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            color: "DarkRed"
        };

        //Если музыка уже приостановлена
        if (queue.player.state.status === "pause") return { text: `${message.author}, ⚠ | Музыка уже приостановлена!`, color: "DarkRed" };

        //Если текущий трек является потоковым
        if (queue.song.isLive) return { text: `${message.author}, ⚠ | Это бесполезно!`, color: "DarkRed" };

        return void message.client.player.emit("pause", message);
    };
}