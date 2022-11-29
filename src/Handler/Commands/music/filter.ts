import {Command, ResolveData} from "../../../Structures/Handle/Command";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {ApplicationCommandOptionType, Colors} from "discord.js";
import {ClientMessage, EmbedConstructor} from "../../Events/Activity/interactionCreate";
import {FFspace} from "../../../AudioPlayer/Structures/Media/FFspace";
import Filters from "../../../../db/Filters.json";
import {ReactionMenu} from "../../../Structures/ReactionMenu";

export default class Filter extends Command {
    public constructor() {
        super({
            name: "filter",
            aliases: ["fl"],
            description: "Включение фильтров для музыки!",
            usage: "name | Все фильтры - all",

            options: [
                {
                    name: "name",
                    description: "Все доступные фильтры - all",
                    type: ApplicationCommandOptionType.String
                }
            ],

            isSlash: true,
            isEnable: true,

            isCLD: 12
        });
    };

    public readonly run = async (message: ClientMessage, args: string[]): Promise<ResolveData> => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если нет очереди
        if (!queue) return { text: `${message.author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };

        //Если пользователь не подключен к голосовым каналам
        if (!message.member?.voice?.channel || !message.member?.voice) return { text: `${message.author}, Подключись к голосовому каналу!`, color: "DarkRed" };

        //Если есть очередь и пользователь не подключен к тому же голосовому каналу
        if (queue && queue.voice && message.member?.voice?.channel?.id !== queue.voice.id) return {
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
            color: "DarkRed"
        };

        //Если текущий трек является потоковым
        if (queue.song.isLive) return { text: `${message.author}, Фильтры не работают со стримами`, color: "DarkRed" };

        const FilterArg = args.length > 1 ? Number(args[args?.length - 1]) : null;
        const FilterName = args[args?.length - 2 ?? args?.length - 1] ?? args[0];
        const SendArg: { color: any, codeBlock: "css" } = {color: "Blue", codeBlock: "css"};

        //Показываем все доступные фильтры
        if (FilterName === "all") return this.#ReactionMenuFilters(Filters, message);
        //Выключаем все фильтры
        else if (FilterName === "off") {
            queue.filters.splice(0, queue.filters.length);
            this.#executeFilter(message);
            return;
        }

        //Если пользователь не указал название фильтра
        if (!FilterName) {
            if (queue.filters.length === 0) return {text: `${message.author.username}, включенных аудио фильтров нет!`, ...SendArg};
            const ArrayFilters: typeof Filters = [];

            queue.filters.forEach((filter) => {
                const Filter = Filters.find((fn) => typeof filter === "number" ? null : fn.names.includes(filter));
                ArrayFilters.push(Filter);
            });

            return this.#ReactionMenuFilters(ArrayFilters, message);
        }

        try {
            //Получаем данные о фильтре
            const Filter = FFspace.getFilter(FilterName);

            //Если есть такой фильтр
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

                            return {text: `${message.author.username} | Filter: ${FilterName} был изменен аргумент на ${FilterArg}!`, ...SendArg};
                            //Если аргументы не подходят
                        } else return {text: `${message.author.username} | Filter: ${FilterName} не изменен из-за несоответствия аргументов!`, ...SendArg};

                    } else { //Если пользователь не указал аргумент, значит его надо удалить
                        if (Filter.args) queue.filters.splice(index, 2); //Удаляем фильтр и аргумент
                        else queue.filters.splice(index, 1); //Удаляем только фильтр

                        return {text: `${message.author.username} | Filter: ${FilterName} отключен!`, ...SendArg};
                    }
                } else { //Если фильтра нет в очереди, значит его надо добавить
                    if (FilterArg && Filter.args) { //Если есть аргумент

                        //Добавляем с аргументом
                        if (FilterArg >= Filter.args[0] && FilterArg <= Filter.args[1]) {
                            queue.filters.push(Filter.names[0]);
                            queue.filters.push(FilterArg as any);
                            return {text: `${message.author.username} | Filter: ${FilterName}:${FilterArg} включен!`, ...SendArg};
                            //Если аргументы не подходят
                        } else return {text: `${message.author.username} | Filter: ${FilterName} не включен из-за несоответствия аргументов!`, ...SendArg};
                    } else { //Если нет аргумента
                        queue.filters.push(Filter.names[0]);

                        return {text: `${message.author.username} | Filter: ${FilterName} включен!`, ...SendArg};
                    }
                }
            } else return {text: `${message.author.username}, у меня нет такого фильтра. Все фильтры - all`, ...SendArg};
        } finally {
            this.#executeFilter(message);
        }
    };

    //Заставляем плеер перезапустить поток для применения фильтра
    readonly #executeFilter = (message: ClientMessage) => message.client.player.emit("filter", message);
    //Запускаем ReactionMenu
    readonly #ReactionMenuFilters = (filters: typeof Filters, message: ClientMessage) => {
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

        //Преобразуем все фильтры в string
        // @ts-ignore
        filters.ArraySort(5).forEach((s) => {
            const parsedFilters = s.map((filter: typeof Filters[0]) => {
                return `Фильтр - [${numFilter++}]
                    **❯ Названия:** ${filter.names ? `(${filter.names})` : `Нет`}
                    **❯ Описание:** ${filter.description ? `(${filter.description})` : `Нет`}
                    **❯ Аргументы:** ${filter.args ? `(${filter.args})` : `Нет`}
                    **❯ Модификатор скорости:** ${filter.speed ? `${filter.speed}` : `Нет`}`
            }).join('\n\n');

            //Если parsedFilters не undefined, то добавляем его в pages
            if (parsedFilters !== undefined) pages.push(parsedFilters);
        });
        embed.description = pages[0];
        embed.footer = { text: `${message.author.username} | Лист 1 из ${pages.length}`, iconURL: message.author.displayAvatarURL() }

        return {embed, callbacks: ReactionMenu.Callbacks(1, pages, embed)};
    };
}