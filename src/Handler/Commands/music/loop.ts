import {Command, ResolveData} from "../../../Structures/Handle/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ApplicationCommandOptionType} from "discord.js";
import {ClientMessage} from "../../Events/Activity/interactionCreate";

export class Loop extends Command {
    public constructor() {
        super({
            name: "loop",
            aliases: ["repeat", "rept"],
            description: "Включение повтора и выключение повтора музыки!",

            usage: "song | Доступны: song, songs, off",
            options: [
                {
                    name: "type",
                    description: "Необходимо указать что-то из | song, on, off",
                    type: ApplicationCommandOptionType.String
                }
            ],

            isSlash: true,
            isEnable: true
        })
    };

    public readonly run = async (message: ClientMessage, args: string[]): Promise<ResolveData> => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если пользователь не подключен к голосовым каналам
        if (!message.member?.voice?.channel || !message.member?.voice) return {
            text: `${message.author}, Подключись к голосовому каналу!`,
            color: "DarkRed"
        };

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && message.member?.voice?.channel?.id !== queue.voice.id) return {
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            color: "DarkRed"
        };

        //Если нет очереди
        if (!queue) return { text: `${message.author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };

        switch (args[0]) {
            case "выкл":
            case "off":
                queue.options.loop = "off";
                return {text: `❌ | Повтор выключен`, codeBlock: "css"};

            case "вкл":
            case "on":
                queue.options.loop = "songs";
                return {text: `🔁 | Повтор всей музыки`, codeBlock: "css"};

            case "one":
            case "1":
            case "song":
                queue.options.loop = "song";
                return {
                    text: `🔂 | Повтор  | ${queue.songs[0].title}`,
                    codeBlock: "css",
                    color: queue.songs[0].color
                };
            default:
                queue.options.loop = queue.options.loop !== "songs" ? "songs" : "off";
                return {text: `🎶 | Повтор ${queue.options.loop}`, codeBlock: "css"};
        }
    };
}