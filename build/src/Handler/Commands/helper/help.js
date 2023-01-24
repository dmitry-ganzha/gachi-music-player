"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Help = void 0;
const Command_1 = require("@Structures/Handle/Command");
const discord_js_1 = require("discord.js");
const ArraySort_1 = require("@Structures/ArraySort");
const ReactionMenu_1 = require("@Structures/ReactionMenu");
const Config_json_1 = require("@db/Config.json");
class Command_Help extends Command_1.Command {
    constructor() {
        super({
            name: "help",
            aliases: ["h"],
            description: "Можешь глянуть все мои команды!",
            usage: "all | command name",
            options: [
                {
                    name: "command-name-or-all",
                    description: "Укажи название команды, или укажи all для просмотра всех команд",
                    required: true,
                    type: discord_js_1.ApplicationCommandOptionType.String
                }
            ],
            isGuild: false,
            isSlash: true,
            isEnable: true,
            isCLD: 35
        });
    }
    ;
    run = (message, args) => {
        const { author, client } = message;
        const Arg = args[args.length - 1];
        const Commands = client.commands.Array.filter((command) => Arg !== "all" ? command.name === Arg || command.aliases.includes(Arg) : !command.isOwner);
        if (Commands.length < 1)
            return { text: `${author}, у меня нет такой команды!` };
        const embed = this.CreateEmbedMessage(message);
        const pages = (0, ArraySort_1.ArraySort)(5, Commands, (command) => `┌Команда [**${command.name}**] | ${command.type}
             ├ **Сокращения:** (${command.aliases.join(", ") ?? `Нет`})
             ├ **Описание:** (${command.description ?? `Нет`})
             └ **Используется:** ${Config_json_1.Bot.prefix}${command.name} ${command.usage}`);
        embed.description = pages[0];
        embed.footer = { text: `${author.username} | Лист 1 из ${pages.length}`, iconURL: author.avatarURL() };
        if (pages.length > 1)
            return { embed, callbacks: ReactionMenu_1.ReactionMenu.Callbacks(1, pages, embed) };
        return { embed };
    };
    CreateEmbedMessage = (message) => {
        return {
            title: "Help Menu",
            color: discord_js_1.Colors.Yellow,
            thumbnail: { url: message.client.user.avatarURL() },
            timestamp: new Date()
        };
    };
}
exports.Command_Help = Command_Help;
