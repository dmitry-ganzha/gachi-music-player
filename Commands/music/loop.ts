import {Command} from "../Constructor";
import {wMessage} from "../../Core/Utils/TypesHelper";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Structures/Queue";

export class CommandLoop extends Command {
    public constructor() {
        super({
            name: "loop",
            aliases: ["repeat", "rept"],
            description: 'Включение и выключение повтора',

            options: [
                {
                    name: "type",
                    description: "Type - (song, on, off)",
                    type: "STRING"
                }
            ],
            slash: true,
            enable: true,
        })
    };

    public run = async (message: wMessage, args: string[]): Promise<void> => {
        const queue: Queue = message.client.queue.get(message.guild.id);

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

        if (!queue) return message.client.Send({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: 'RED'
        });

        switch (args[0]) {
            case 'выкл':
            case 'off':
                queue.options.loop = "off";
                return message.client.Send({text: `❌ | Повтор выключен`, message, type: 'css'});

            case 'вкл':
            case 'on':
                queue.options.loop = "songs";
                return message.client.Send({text: `🔁 | Повтор всей музыки`, message, type: 'css'});

            case 'one':
            case '1':
            case 'song':
                queue.options.loop = "song";
                void queue.events.message.emit("update", queue.channels.message);
                return message.client.Send({
                    text: `🔂 | Повтор  | ${queue.songs[0].title}`,
                    message,
                    type: 'css',
                    color: queue.songs[0].color
                });
            default:
                queue.options.loop = queue.options.loop !== "songs" ? "songs" : "off";

                let loop = null;
                if (queue.options.loop === "songs") loop = 'всей музыки';
                else if (queue.options.loop === "off") loop = 'выкл';
                else if (queue.options.loop === "song") loop = 'одной музыки';
                return message.client.Send({text: `🎶 | Повтор ${loop}`, message, type: 'css'});
        }
    };
}