import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {ApplicationCommandOptionType} from "discord.js";

export class CommandSeek extends Command {
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

    public run = (message: ClientMessage, args: string[]): void => {
        const queue: Queue = message.client.queue.get(message.guild.id), choiceDur: any[] = args.join(" ").split(":");
        let optDur: number;

        if (!queue) return message.client.Send({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: 'RED'
        });

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

        if (queue.songs[0].isLive) return message.client.Send({
            text: `${message.author}, А как? Это же стрим!`,
            message,
            color: 'RED'
        });

        if (!choiceDur) return message.client.Send({
            text: `${message.author}, Укажи время, пример 00:00:00!`,
            message,
            color: 'RED'
        })
        else if (choiceDur.length > 1) {
            if (!choiceDur[2]) optDur = (choiceDur[0] * 60) + (choiceDur[1] % 60000);
            else optDur = (choiceDur[0] * 60 * 60) + (choiceDur[1] * 60) + (choiceDur[2] % 60000);
        } else optDur = parseInt(args[0]);

        if (isNaN(optDur)) return message.client.Send({
            text: `${message.author}, Я не могу определить что ты написал, попробуй еще раз!`,
            message,
            color: 'RED'
        });
        if (optDur > queue.songs[0].duration.seconds) return message.client.Send({
            text: `${message.author}, Ты указал слишком много времени!`,
            message,
            color: 'RED'
        });

        return void message.client.player.emit('seek', message, optDur);
    };
}