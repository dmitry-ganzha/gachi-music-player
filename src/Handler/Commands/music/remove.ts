import {Command, ResolveData} from "../../../Structures/Handle/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ApplicationCommandOptionType} from "discord.js";
import {ClientMessage} from "../../Events/Activity/interactionCreate";

export class Remove extends Command {
    public constructor() {
        super({
            name: "remove",
            aliases: [],
            description: "Эта команда удаляет из очереди музыку!",

            usage: "1 | Можно убрать любой трек из очереди | Если аргумент не указан он будет равен 1",
            options: [
                {
                    name: "value",
                    description: "Номер трека который надо удалить из очереди",
                    required: true,
                    type: ApplicationCommandOptionType.String
                }
            ],

            isEnable: true,
            isSlash: true
        })
    };

    public readonly run = async (message: ClientMessage, args: string[]): Promise<ResolveData> => {
        const queue: Queue = message.client.queue.get(message.guild.id);
        const argsNum = args[0] ? parseInt(args[0]) : 1;

        //Если нет очереди
        if (!queue) return { text: `${message.author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };

        //Если пользователь не подключен к голосовым каналам
        if (!message.member?.voice?.channel || !message.member?.voice) return { text: `${message.author}, Подключись к голосовому каналу!`, color: "DarkRed" };

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && message.member?.voice?.channel?.id !== queue.voice.id) return {
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            color: "DarkRed"
        };

        //Если аргумент не число
        if (isNaN(argsNum)) return { text: `${message.author}, Это не число!`, color: "DarkRed" };

        //Если аргумент больше кол-ва треков
        if (argsNum > queue.songs.length) return { text: `${message.author}, Я не могу убрать музыку, поскольку всего ${queue.songs.length}!`, color: "DarkRed" };

        return void message.client.player.emit("remove", message, argsNum);
    };
}