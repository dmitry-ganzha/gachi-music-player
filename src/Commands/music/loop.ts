import {Command} from "../../Structures/Command";
import {Queue} from "../../Core/AudioPlayer/Structures/Queue/Queue";
import {ApplicationCommandOptionType} from "discord.js";
import {ClientMessage} from "../../Events/Activity/Message";

export default class Loop extends Command {
    public constructor() {
        super({
            name: "loop",
            aliases: ["repeat", "rept"],
            description: "Включение повтора и выключение повтора музыки!",

            options: [
                {
                    name: "type",
                    description: "Type - (song, on, off)",
                    type: ApplicationCommandOptionType.String
                }
            ],
            slash: true,
            enable: true,
        })
    };

    public readonly run = (message: ClientMessage, args: string[]): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.sendMessage({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: "RED"
        });

        //Если пользователь не подключен к голосовым каналам
        if (!message.member.voice.channel || !message.member.voice) return message.client.sendMessage({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "RED"
        });

        //Если нет очереди
        if (!queue) return message.client.sendMessage({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "RED"
        });

        switch (args[0]) {
            case "выкл":
            case "off":
                queue.options.loop = "off";
                return message.client.sendMessage({text: `❌ | Повтор выключен`, message, type: "css"});

            case "вкл":
            case "on":
                queue.options.loop = "songs";
                return message.client.sendMessage({text: `🔁 | Повтор всей музыки`, message, type: "css"});

            case "one":
            case "1":
            case "song":
                queue.options.loop = "song";
                return message.client.sendMessage({ text: `🔂 | Повтор  | ${queue.songs[0].title}`, message, type: "css", color: queue.songs[0].color });
            default:
                queue.options.loop = queue.options.loop !== "songs" ? "songs" : "off";

                let loop = null;
                if (queue.options.loop === "songs") loop = 'всей музыки';
                else if (queue.options.loop === "off") loop = 'выкл';
                else if (queue.options.loop === "song") loop = 'одной музыки';
                return message.client.sendMessage({text: `🎶 | Повтор ${loop}`, message, type: "css"});
        }
    };
}