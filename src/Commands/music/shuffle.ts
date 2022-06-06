import {Command} from "../Constructor";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {ClientMessage} from "../../Core/Client";
import {Song} from "../../Core/Player/Structures/Queue/Song";
import {ApplicationCommandOptionType} from "discord.js";

export class CommandShuffle extends Command {
    public constructor() {
        super({
            name: "shuffle",
            aliases: [],
            description: "Перетасовка музыки в очереди текущего сервера!",

            options: [{
                name: "value",
                description: "Shuffle queue songs",
                required: true,
                type: ApplicationCommandOptionType.String
            }],
            enable: true,
            slash: true
        });
    };

    public run = (message: ClientMessage): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

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

        if (!queue.songs) return message.client.Send({
            text: `${message.author}, Нет музыки в очереди!`,
            message,
            color: 'RED'
        });

        if (queue.songs.length < 3) return message.client.Send({
            text: `${message.author}, Очень мало музыки, нужно более 3`,
            message,
            color: 'RED'
        });

        this.#shuffleSongs(queue.songs);
        return message.client.Send({text: `🔀 | Shuffle total [${queue.songs.length}]`, message, type: 'css'});
    };

    #shuffleSongs = (songs: Song[]): void => {
        for (let i = songs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [songs[i], songs[j]] = [songs[j], songs[i]];
        }
    };
}