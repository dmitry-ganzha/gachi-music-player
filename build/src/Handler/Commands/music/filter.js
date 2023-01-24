"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Filter = void 0;
const tslib_1 = require("tslib");
const discord_js_1 = require("discord.js");
const Command_1 = require("@Structures/Handle/Command");
const ArraySort_1 = require("@Structures/ArraySort");
const ReactionMenu_1 = require("@Structures/ReactionMenu");
const FFspace_1 = require("@Structures/Media/FFspace");
const Filters_json_1 = tslib_1.__importDefault(require("@db/Filters.json"));
class Command_Filter extends Command_1.Command {
    constructor() {
        super({
            name: "filter",
            aliases: ["fl"],
            description: "Включение фильтров для музыки!",
            usage: "name | Все фильтры - all",
            options: [
                {
                    name: "name",
                    description: "Все доступные фильтры - all",
                    type: discord_js_1.ApplicationCommandOptionType.String
                }
            ],
            isSlash: true,
            isEnable: true,
            isCLD: 12
        });
    }
    ;
    run = (message, args) => {
        const { author, member, guild, client } = message;
        const queue = client.queue.get(guild.id);
        if (!queue)
            return { text: `${author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };
        if (!member?.voice?.channel || !member?.voice)
            return { text: `${author}, Подключись к голосовому каналу!`, color: "DarkRed" };
        if (queue && queue.voice && member?.voice?.channel?.id !== queue.voice.id)
            return {
                text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`,
                color: "DarkRed"
            };
        if (!queue.player.hasSkipped)
            return { text: `${author} | На данном этапе невозможно пропустить поток!`, color: "DarkRed" };
        if (queue.song.isLive)
            return { text: `${author}, Фильтр не может работать совместно с Live треками!`, color: "DarkRed" };
        const FilterArg = args.length > 1 ? Number(args[args?.length - 1]) : null;
        const FilterName = args[args?.length - 2 ?? args?.length - 1] ?? args[0];
        const SendArg = { color: "Blue", codeBlock: "css" };
        if (FilterName === "all")
            return this.ReactionMenuFilters(Filters_json_1.default, message);
        else if (FilterName === "off") {
            queue.filters.splice(0, queue.filters.length);
            client.player.filter(message);
            return;
        }
        if (!FilterName) {
            if (queue.filters.length === 0)
                return { text: `${author.username}, включенных аудио фильтров нет!`, ...SendArg };
            const ArrayFilters = [];
            queue.filters.forEach((filter) => {
                const Filter = Filters_json_1.default.find((fn) => typeof filter === "number" ? null : fn.names.includes(filter));
                ArrayFilters.push(Filter);
            });
            return this.ReactionMenuFilters(ArrayFilters, message);
        }
        const Filter = FFspace_1.FFspace.getFilter(FilterName);
        try {
            if (Filter) {
                const enableFilter = !!queue.filters.find((filter) => typeof filter === "number" ? null : Filter.names.includes(filter));
                if (enableFilter) {
                    const index = queue.filters.indexOf(FilterName);
                    if (FilterArg && Filter.args) {
                        if (FilterArg >= Filter.args[0] && FilterArg <= Filter.args[1]) {
                            queue.filters[index + 1] = FilterArg;
                            return { text: `${author.username} | Filter: ${FilterName} был изменен аргумент на ${FilterArg}!`, ...SendArg };
                        }
                        else
                            return { text: `${author.username} | Filter: ${FilterName} не изменен из-за несоответствия аргументов!`, ...SendArg };
                    }
                    else {
                        if (Filter.args)
                            queue.filters.splice(index, 2);
                        else
                            queue.filters.splice(index, 1);
                        return { text: `${author.username} | Filter: ${FilterName} отключен!`, ...SendArg };
                    }
                }
                else {
                    if (FilterArg && Filter.args) {
                        if (FilterArg >= Filter.args[0] && FilterArg <= Filter.args[1]) {
                            queue.filters.push(Filter.names[0]);
                            queue.filters.push(FilterArg);
                            return { text: `${author.username} | Filter: ${FilterName}:${FilterArg} включен!`, ...SendArg };
                        }
                        else
                            return { text: `${author.username} | Filter: ${FilterName} не включен из-за несоответствия аргументов!`, ...SendArg };
                    }
                    else {
                        queue.filters.push(Filter.names[0]);
                        return { text: `${author.username} | Filter: ${FilterName} включен!`, ...SendArg };
                    }
                }
            }
            else
                return { text: `${author.username}, у меня нет такого фильтра. Все фильтры - all`, ...SendArg };
        }
        finally {
            if (Filter)
                client.player.filter(message);
        }
    };
    ReactionMenuFilters = (filters, message) => {
        const embed = { title: "Все доступные фильтры", color: discord_js_1.Colors.Yellow, thumbnail: { url: message.client.user.avatarURL() }, timestamp: new Date() };
        const pages = (0, ArraySort_1.ArraySort)(5, filters, (filter, index) => {
            return `┌Номер в списке - [${index + 1}]
                    ├ **Названия:** ${filter.names ? `(${filter.names})` : `Нет`}
                    ├ **Описание:** ${filter.description ? `(${filter.description})` : `Нет`}
                    ├ **Аргументы:** ${filter.args ? `(${filter.args})` : `Нет`}
                    └ **Модификатор скорости:** ${filter.speed ? `${filter.speed}` : `Нет`}`;
        });
        embed.description = pages[0];
        embed.footer = { text: `${message.author.username} | Лист 1 из ${pages.length}`, iconURL: message.author.displayAvatarURL() };
        return { embed, callbacks: ReactionMenu_1.ReactionMenu.Callbacks(1, pages, embed) };
    };
}
exports.Command_Filter = Command_Filter;
