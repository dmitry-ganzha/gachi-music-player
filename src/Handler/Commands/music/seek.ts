import {Command} from "../../../Structures/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ApplicationCommandOptionType} from "discord.js";
import {ClientMessage} from "../../Events/Activity/Message";

export default class Seek extends Command {
    public constructor() {
        super({
            name: "seek",
            aliases: ['begin', 'sek', 'beg'],
            description: "Пропуск времени в текущем треке!",

            options: [{
                name: "value",
                description: "Пример - 00:00",
                required: true,
                type: ApplicationCommandOptionType.String
            }],
            enable: true,
            slash: true,
            CoolDown: 10
        });
    };

    public readonly run = (message: ClientMessage, args: string[]): void => {
        const queue: Queue = message.client.queue.get(message.guild.id), ArgDuration: any[] = args.join(" ").split(":");
        let EndDuration: number;

        //Если нет очереди
        if (!queue) return message.client.sendMessage({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "DarkRed"
        });

        //Если пользователь не подключен к голосовым каналам
        if (!message.member?.voice?.channel || !message.member?.voice) return message.client.sendMessage({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "DarkRed"
        });

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && message.member?.voice?.channel?.id !== queue.voice.id) return message.client.sendMessage({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            message,
            color: "DarkRed"
        });

        //Если текущий трек является потоковым
        if (queue.songs[0].isLive) return message.client.sendMessage({
            text: `${message.author}, А как? Это же стрим!`,
            message,
            color: "DarkRed"
        });

        //Если пользователь не указал время
        if (!ArgDuration) return message.client.sendMessage({
            text: `${message.author}, Укажи время, пример 00:00:00!`,
            message,
            color: "DarkRed"
        });
        else if (ArgDuration.length > 1) {
            if (!ArgDuration[2]) EndDuration = (ArgDuration[0] * 60) + (ArgDuration[1] % 60000);
            else EndDuration = (ArgDuration[0] * 60 * 60) + (ArgDuration[1] * 60) + (ArgDuration[2] % 60000);
        } else EndDuration = parseInt(args[0]);

        //Если пользователь написал что-то не так
        if (isNaN(EndDuration)) return message.client.sendMessage({
            text: `${message.author}, Я не могу определить что ты написал, попробуй еще раз!`,
            message,
            color: "DarkRed"
        });

        //Если пользователь указал времени больше чем в треке
        if (EndDuration > queue.songs[0].duration.seconds) return message.client.sendMessage({
            text: `${message.author}, Ты указал слишком много времени!`,
            message,
            color: "DarkRed"
        });

        return void message.client.player.emit("seek", message, EndDuration);
    };
}