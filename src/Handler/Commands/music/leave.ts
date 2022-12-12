import {Command, ResolveData} from "../../../Structures/Handle/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ClientMessage} from "../../Events/Activity/interactionCreate";
import { Voice } from "../../../AudioPlayer/Structures/Voice/Voice";

export class Leave extends Command {
    public constructor() {
        super({
            name: "stop",
            aliases: ["end"],
            description: "Отключение от голосового канала!",

            isGuild: true,
            isEnable: true,
            isSlash: true
        });
    };

    public readonly run = async (message: ClientMessage): Promise<ResolveData> => {
        const {guild, member, author} = message;
        const queue: Queue = message.client.queue.get(guild.id);
        const actVoice = Voice.getVoice(guild.id);

        //Если бот не подключен к голосовому каналу
        if (!actVoice) return {text: `${author}, я не подключен к голосовому каналу!`, color: "DarkRed"};

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && member?.voice?.channel?.id !== queue.voice.id) return {
            text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`, color: "DarkRed"
        };

        //Если включен режим радио
        if (queue && queue.options.radioMode) return {text: `${author}, я не могу отключится из-за включенного режима радио!`};

        Voice.Disconnect(guild.id);
        if (queue) return {text: `${author}, отключение от голосового канала! Очередь будет удалена через **20 сек**!`};
    };
}
