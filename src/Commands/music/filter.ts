import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {ApplicationCommandOptionType} from "discord.js";
import FFmpegConfiguration from "../../../DataBase/FFmpeg.json";
import {getEnableFilters} from "../../Core/Player/Structures/Media/FFmpeg";

export class CommandLoop extends Command {
    public constructor() {
        super({
            name: "filter",
            aliases: ["fl"],
            description: "Включение фильтров для музыки!",

            options: [
                {
                    name: "name",
                    description: "Все доступные фильтры - all",
                    type: ApplicationCommandOptionType.String
                }
            ],
            slash: true,
            enable: true,
            CoolDown: 12
        });
    };

    public run = (message: ClientMessage, args: string[]): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: "RED"
        });

        if (!message.member.voice.channel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "RED"
        });

        if (!queue) return message.client.Send({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "RED"
        });

        if (queue.songs[0].isLive) return message.client.Send({
            text: `${message.author}, Фильтры не работают со стримами`,
            message,
            color: "RED"
        });

        if (!queue.player.hasChangeStream) return message.client.Send({
            text: `${message.author}, в данный момент это действие невозможно!`,
            message,
            color: "RED"
        });

        const song = queue.songs[0];
        const argsNum = Number(args[1]);
        const SendArg: {color: number, type: "css", message: ClientMessage} = {color: song.color, type: "css", message};
        const NameFilter = args[0]?.toLowerCase();

        if (!NameFilter) return message.client.Send({text: `Включенные фильтры: ${getEnableFilters(queue.audioFilters) ?? "нет включенных фильтров"}`, ...SendArg});

        if (NameFilter === "all") return message.client.Send({text: `Все фильтры: ${FFmpegConfig()}`, ...SendArg});

        if (NameFilter === "off") {
            queue.audioFilters = [];
            void message.client.player.emit("filter", message);
            return message.client.Send({text: "Все фильтры: отключены", ...SendArg});
        }

        // @ts-ignore
        const Filter = FFmpegConfiguration.FilterConfigurator[NameFilter];

        if (Filter) {
            //Disable filter
            if (queue.audioFilters.includes(NameFilter)) {
                if (Filter.value === false) queue.audioFilters = queue.audioFilters.filter((name: string) => name !== NameFilter);
                else {
                    const index = queue.audioFilters.indexOf(NameFilter);
                    if (index === -1) return;
                    queue.audioFilters.splice(index, 2);
                }
                void message.client.player.emit("filter", message);
                return message.client.Send({text: `${message.author.username} | Filter: ${NameFilter} выключен`, ...SendArg});
            }
            //Enable filter
            if (Filter.value === false) queue.audioFilters.push(NameFilter);
            else {
                if (!argsNum || argsNum > Filter.value.max || argsNum < Filter.value.min)
                    return message.client.Send({text: `${message.author.username}, для этого фильтра нужно указать значение между ${Filter.value.max} - ${Filter.value.min}!`, ...SendArg})

                queue.audioFilters.push(NameFilter);
                // @ts-ignore
                queue.audioFilters.push(argsNum);
            }
            void message.client.player.emit("filter", message);
            return message.client.Send({text: `${message.author.username} | Filter: ${NameFilter} включен`, ...SendArg});
        }
        return message.client.Send({text: `${message.author.username}, я не нахожу ${NameFilter} в своей базе. Может он появится позже!`, ...SendArg})
    };
}

function FFmpegConfig() {
    const resp = [];
    for (let key of Object.keys(FFmpegConfiguration.FilterConfigurator)) {
        resp.push(key);
    }

    return resp.join(", ");
}