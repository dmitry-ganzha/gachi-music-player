import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {getEnableFilters} from "../../Core/Player/FFmpeg";
import {ApplicationCommandOptionType} from "discord.js";

export class CommandLoop extends Command {
    public constructor() {
        super({
            name: "filter",
            aliases: ["fl"],
            description: 'Включение фильтров для музыки!',

            options: [
                {
                    name: "name",
                    description: "Filters - 3D, karaoke, nightcore, speed, bassboost, sub-boost, vaporwave",
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
            color: 'RED'
        });

        const song = queue.songs[0];
        const argsNum = Number(args[1]);
        const SendArg: {color: number, type: "css", message: ClientMessage} = {color: song.color, type: "css", message};

        switch (args[0]) {
            case 'off':
                queue.audioFilters.Vw = false;
                queue.audioFilters.nightcore = false;
                queue.audioFilters.echo = false;
                queue.audioFilters["3d"] = false;
                queue.audioFilters.karaoke = false;
                queue.audioFilters.speed = 0;
                queue.audioFilters.bass = 0;
                queue.audioFilters.Sub_bass = false;
                void message.client.player.emit("filter", message);
                return message.client.Send({text: `Filter | [Off]`, ...SendArg});
            //
            case 'nc':
            case 'nightcore':
               queue.audioFilters.nightcore = !queue.audioFilters.nightcore;
               queue.audioFilters.Vw = false;
               void message.client.player.emit("filter", message);
               return message.client.Send({text: `Filter | [NightCore]: ${queue.audioFilters.nightcore}`, ...SendArg});
           //
            case 'echo':
               queue.audioFilters.echo = !queue.audioFilters.echo;
               void message.client.player.emit("filter", message);
               return message.client.Send({text: `Filter | [ECHO]: ${queue.audioFilters.echo}`, ...SendArg});
           //
           case '3d':
           case '3D':
               queue.audioFilters["3d"] = !queue.audioFilters["3d"];
               void message.client.player.emit("filter", message);
               return message.client.Send({text: `Filter | [3D]: ${queue.audioFilters["3d"]}`, ...SendArg});
           //
           case 'karaoke':
               queue.audioFilters.karaoke = !queue.audioFilters.karaoke;
               void message.client.player.emit("filter", message);
               return message.client.Send({text: `Filter | [Karaoke]: ${queue.audioFilters.karaoke}`, ...SendArg});
           //
           case 'speed':
               queue.audioFilters.speed = argsNum < 1 ? 0 : argsNum > 3 ? 3 : argsNum;
               void message.client.player.emit("filter", message);
               return message.client.Send({text: `Filter | [Speed]: ${queue.audioFilters.speed}`, ...SendArg});
           //
           case 'bb':
           case 'bass':
               queue.audioFilters.bass = argsNum > 10 ? 10 : argsNum < 0 ? 0 : argsNum;
               queue.audioFilters.Sub_bass = false;
               void message.client.player.emit("filter", message);
               return message.client.Send({text: `Filter | [BassBoost]: ${queue.audioFilters.bass}`, ...SendArg});
           //
           case 'sb':
           case 'subboost':
                queue.audioFilters.Sub_bass = !queue.audioFilters.Sub_bass;
                queue.audioFilters.bass = 0;
                void message.client.player.emit("filter", message);
                return message.client.Send({text: `Filter | [SubBoost]: ${queue.audioFilters.Sub_bass}`, ...SendArg});
           //
           case 'vw':
           case 'vaporwave':
              queue.audioFilters.Vw = !queue.audioFilters.Vw;
              queue.audioFilters.nightcore = false;
              void message.client.player.emit("filter", message);
              return message.client.Send({text: `Filter | [VaporWave]: ${queue.audioFilters.Vw}`, ...SendArg});
           //
          default: return message.client.Send({text: `All filter command: [nightcore, 3D, karaoke, speed, bass, vaporwave, sub-boost]\n\nCurrent: [${getEnableFilters(queue.audioFilters)}]\nDisable all - !fl off`, ...SendArg});
        }
    };
}