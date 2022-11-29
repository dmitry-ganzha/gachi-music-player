import {Command, ResolveData} from "../../../Structures/Handle/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ApplicationCommandOptionType} from "discord.js";
import {ClientMessage} from "../../Events/Activity/interactionCreate";

export class Seek extends Command {
    public constructor() {
        super({
            name: "seek",
            aliases: ['begin', 'sek', 'beg'],
            description: "Пропуск времени в текущем треке!",

            usage: "00:00 | 20",
            options: [{
                name: "value",
                description: "Пример - 00:00",
                required: true,
                type: ApplicationCommandOptionType.String
            }],

            isEnable: true,
            isSlash: true,

            isCLD: 10
        });
    };

    public readonly run = async (message: ClientMessage, args: string[]): Promise<ResolveData> => {
        const queue: Queue = message.client.queue.get(message.guild.id), ArgDuration: any[] = args.join(" ").split(":");
        let EndDuration: number;

        //Если нет очереди
        if (!queue) return { text: `${message.author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };

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

        //Если текущий трек является потоковым
        if (queue.song.isLive) return { text: `${message.author}, А как? Это же стрим!`, color: "DarkRed" };

        //Если пользователь не указал время
        if (!ArgDuration) return { text: `${message.author}, Укажи время, пример 00:00:00!`, color: "DarkRed" };
        else if (ArgDuration.length > 1) {
            if (!ArgDuration[2]) EndDuration = (ArgDuration[0] * 60) + (ArgDuration[1] % 60000);
            else EndDuration = (ArgDuration[0] * 60 * 60) + (ArgDuration[1] * 60) + (ArgDuration[2] % 60000);
        } else EndDuration = parseInt(args[0]);

        //Если пользователь написал что-то не так
        if (isNaN(EndDuration)) return {
            text: `${message.author}, Я не могу определить что ты написал, попробуй еще раз!`,
            color: "DarkRed"
        };

        //Если пользователь указал времени больше чем в треке
        if (EndDuration > queue.song.duration.seconds) return { text: `${message.author}, Ты указал слишком много времени!`, color: "DarkRed" };

        return void message.client.player.emit("seek", message, EndDuration);
    };
}