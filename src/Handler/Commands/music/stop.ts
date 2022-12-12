import {Command, ResolveData} from "../../../Structures/Handle/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ClientMessage} from "../../Events/Activity/interactionCreate";

export class Stop extends Command {
    public constructor() {
        super({
            name: "stop",
            aliases: ["end"],
            description: "Удаление музыкальной очереди!",

            isEnable: true,
            isSlash: true
        });
    };

    public readonly run = async (message: ClientMessage): Promise<ResolveData> => {
        const {author, guild, member} = message;
        const queue: Queue = message.client.queue.get(guild.id);

        //Если нет очереди
        if (!queue) return { text: `${author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue.voice && member?.voice?.channel?.id !== queue.voice.id) return {
            text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`, color: "DarkRed"
        };

        //Если включен режим радио
        if (queue.options.radioMode) return { text: `${author}, Невозможно из-за включенного режима радио!`, color: "DarkRed" };

        queue.cleanup();
        return {text: `${author}, музыкальная очередь удалена!`};
    };
}