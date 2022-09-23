import {Command} from "../../../Structures/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ApplicationCommandOptionType, Colors} from "discord.js";
import {ClientMessage, EmbedConstructor} from "../../Events/Activity/Message";
import {FFmpeg} from "../../../AudioPlayer/Structures/Media/FFmpeg";
import Filters from "../../../../DataBase/Filters.json";
import {ReactionMenu} from "../../../Core/Utils/ReactionMenu";

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
            color: "DarkRed"
        });

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && message.member.voice.channel.id !== queue.voice.id) return message.client.sendMessage({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            message,
            color: "DarkRed"
        });

        //Если пользователь не подключен к голосовым каналам
        if (!message.member.voice.channel || !message.member.voice) return message.client.sendMessage({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "DarkRed"
        });

        //Если текущий трек является потоковым
        if (queue.songs[0].isLive) return message.client.sendMessage({
            text: `${message.author}, Фильтры не работают со стримами`,
            message,
            color: "DarkRed"
        });

        const FilterArg = args.length > 1 ? Number(args[args?.length - 1]) : null;
        const FilterName = args[args?.length - 2 ?? args?.length - 1] ?? args[0];
        const SendArg: {color: any, type: "css", message: ClientMessage} = {color: "Blue", type: "css", message};


        if (FilterName === "all") return this.ReactionMenuFilters(Filters, message); //Показываем все доступные фильтры
        else if (FilterName === "off") { //Выключаем все фильтры
            queue.filters.splice(0, queue.filters.length);
            this.#executeFilter(message);
            return;
        }

        if (!FilterName) { //Если пользователь не указал название фильтра
            if (queue.filters.length === 0) return message.client.sendMessage({text: `${message.author.username}, включенных аудио фильтров нет!`, ...SendArg});
            const ArrayFilters: typeof Filters = [];

            queue.filters.forEach((filter) => {
                const Filter = Filters.find((fn) => typeof filter === "number" ? null : fn.names.includes(filter));
                ArrayFilters.push(Filter);
            });

            return this.ReactionMenuFilters(ArrayFilters, message);
        }

        const Filter = FFmpeg.getFilter(FilterName);

        if (Filter) {
            const enableFilter = !!queue.filters.find((filter) => typeof filter === "number" ? null : Filter.names.includes(filter));

            //Если фильтр есть в очереди
            if (enableFilter) {
                const index = queue.filters.indexOf(FilterName);

                //Если пользователь указал аргумент, значит его надо заменить
                if (FilterArg && Filter.args) {

                    //Изменяем аргумент фильтра
                    if (FilterArg >= Filter.args[0] && FilterArg <= Filter.args[1]) {
                        queue.filters[index + 1] = FilterArg;

                        message.client.sendMessage({text: `${message.author.username} | Filter: ${FilterName} аргумент изменен!`, ...SendArg});
                    //Если аргументы не подходят
                    } else return message.client.sendMessage({text: `${message.author.username} | Filter: ${FilterName} не изменен из-за несоответствия аргументов!`, ...SendArg});

                } else { //Если пользователь не указал аргумент, значит его надо удалить
                    if (Filter.args) queue.filters.splice(index, 2); //Удаляем фильтр и аргумент
                    else queue.filters.splice(index, 1); //Удаляем только фильтр

                    message.client.sendMessage({text: `${message.author.username} | Filter: ${FilterName} отключен!`, ...SendArg});
                }
            } else { //Если фильтра нет в очереди, значит его надо добавить
                if (FilterArg && Filter.args) { //Если есть аргумент

                    //Добавляем с аргументом
                    if (FilterArg > Filter.args[0] && FilterArg < Filter.args[1]) {
                        queue.filters.push(Filter.names[0]);
                        queue.filters.push(FilterArg as any);
                        message.client.sendMessage({text: `${message.author.username} | Filter: ${FilterName} включен!`, ...SendArg});
                    //Если аргументы не подходят
                    } else return message.client.sendMessage({text: `${message.author.username} | Filter: ${FilterName} не включен из-за несоответствия аргументов!`, ...SendArg});
                } else { //Если нет аргумента
                    queue.filters.push(Filter.names[0]);

                    message.client.sendMessage({text: `${message.author.username} | Filter: ${FilterName} включен!`, ...SendArg});
                }
            }
        } else return message.client.sendMessage({text: `${message.author.username}, у меня нет такого фильтра. Все фильтры - all`, message});

        this.#executeFilter(message);
    };

    //Заставляем плеер перезапустить поток для применения фильтра
    readonly #executeFilter = (message: ClientMessage) => message.client.player.emit("filter", message);

    readonly ReactionMenuFilters = (filters: typeof Filters, message: ClientMessage) => {
        let numFilter = 1;
        const pages: string[] = [];
        const embed: EmbedConstructor = {
            title: "Все доступные фильтры",
            color: Colors.Yellow,
            thumbnail: {
                url: message.client.user.avatarURL()
            },
            timestamp: new Date()
        };

        //Преобразуем все команды в string
        // @ts-ignore
        Filters.ArraySort(5).forEach((s) => {
            const parsedFilters = s.map((filter: typeof Filters[0]) => {
                return `[${numFilter++}] Фильтр
                    **❯ Названия:** ${filter.names ? `(${filter.names})` : `Нет`} 
                    **❯ Описание:** ${filter.description ? `(${filter.description})` : `Нет`}
                    **❯ Аргументы:** ${filter.args ? `(${filter.args})` : `Нет`}
                    **❯ Модификатор скорости:** ${filter.speed ? `${filter.speed}` : `Нет`}
                    -------- -------- -------- -------- -------- -------- --------
                    `
            }).join('\n\n');

            //Если parsedCommand не undefined, то добавляем его в pages
            if (parsedFilters !== undefined) pages.push(parsedFilters);
        });
        embed.description = pages[0];
        embed.footer = {text: `${message.author.username} | Лист 1 из ${pages.length}`, iconURL: message.author.displayAvatarURL()}

        new ReactionMenu(embed, message, ReactionMenu.Callbacks(1, pages, embed));
    };
}