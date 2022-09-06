import {Command} from "../../../Structures/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ApplicationCommandOptionType} from "discord.js";
import FFmpegConfiguration from "../../../../DataBase/FFmpeg.json";
import {ClientMessage} from "../../Events/Activity/Message";

const allFilters: string = Object.keys(FFmpegConfiguration.FilterConfigurator).join(", ");

export default class Filter extends Command {
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

    public readonly run = (message: ClientMessage, args: string[]): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если нет очереди
        if (!queue) return message.client.sendMessage({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "RED"
        });

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.sendMessage({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: "RED"
        });

        //Если пользователь не подключен к голосовым каналам
        if (!message.member.voice.channel || !message.member.voice) return message.client.sendMessage({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "RED"
        });

        //Если текущий трек является потоковым
        if (queue.songs[0].isLive) return message.client.sendMessage({
            text: `${message.author}, Фильтры не работают со стримами`,
            message,
            color: "RED"
        });

        const song = queue.songs[0];
        const argsNum = Number(args[1]);
        const SendArg: {color: number, type: "css", message: ClientMessage} = {color: song.color, type: "css", message};
        const NameFilter = args[0]?.toLowerCase();

        if (!NameFilter) return message.client.sendMessage({text: `Включенные фильтры: ${queue.audioFilters.filter((name) => typeof name === "string").join(", ") ?? "нет включенных фильтров"}`, ...SendArg});

        //Показываем все доступные фильтры
        if (NameFilter === "all") return message.client.sendMessage({text: `Все фильтры: ${allFilters}`, ...SendArg});

        //Отключение всех фильтров
        if (NameFilter === "off") {
            queue.audioFilters = [];
            void message.client.player.emit("filter", message);
            //Сообщаем что все выключено
            return message.client.sendMessage({text: "Все фильтры: отключены", ...SendArg});
        }

        // @ts-ignore
        const Filter = FFmpegConfiguration.FilterConfigurator[NameFilter];

        if (Filter) {

            //Выключаем фильтр
            if (queue.audioFilters.includes(NameFilter)) {
                //Если фильтр не требует аргумента
                if (Filter.value === false) queue.audioFilters = queue.audioFilters.filter((name: string) => name !== NameFilter);
                else { //Если у фильтра есть аргументы

                    //Ищем аргумент
                    const index = queue.audioFilters.indexOf(NameFilter);
                    if (index === -1) return;
                    queue.audioFilters.splice(index, 2); //Удаляем аргумент
                }
                this.#executeFilter(message);

                //Сообщаем что он выключен
                return message.client.sendMessage({text: `${message.author.username} | Filter: ${NameFilter} выключен`, ...SendArg});
            }

            //Включаем фильтр
            if (Filter.value === false) queue.audioFilters.push(NameFilter); //Если фильтр не требует аргумента
            else {
                //Если у фильтра есть аргументы
                if (!argsNum || argsNum > Filter.value.max || argsNum < Filter.value.min)return message.client.sendMessage({text: `${message.author.username}, для этого фильтра нужно указать значение между ${Filter.value.max} - ${Filter.value.min}!`, ...SendArg})

                //Добавляем сам фильтр и нужный аргумент
                queue.audioFilters.push(NameFilter);
                queue.audioFilters.push(argsNum as any);
            }
            this.#executeFilter(message);

            //Сообщаем что он включен
            return message.client.sendMessage({text: `${message.author.username} | Filter: ${NameFilter} включен`, ...SendArg});
        }

        //Если фильтр не найден в FFmpegConfigurator
        return message.client.sendMessage({text: `${message.author.username}, я не нахожу ${NameFilter} в своей базе. Может он появится позже!`, ...SendArg})
    };

    //Заставляем плеер перезапустить поток для применения фильтра
    readonly #executeFilter = (message: ClientMessage) => message.client.player.emit("filter", message);
}