import {Command, messageUtils} from "../../../Structures/Handle/Command";
import {ReactionMenu} from "../../../Structures/ReactionMenu";
import {ApplicationCommandOptionType, Colors} from "discord.js";
import {ClientMessage, EmbedConstructor} from "../../Events/Activity/interactiveCreate";
import {Bot} from "../../../../db/Config.json";

export class Help extends Command {
    public constructor() {
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
                    type: ApplicationCommandOptionType.String
                }
            ],

            isGuild: false,
            isSlash: true,
            isEnable: true,

            isCLD: 35
        });
    };

    public readonly run = (message: ClientMessage, args: string[]): any => {
        const memberArg = args[args.length - 1];

        //Показать все команды
        if (memberArg === "all") {
            const Commands: Command[] = message.client.commands.Array.filter((command) => !command.isOwner);
            // @ts-ignore
            const List: Command[][] = Commands.ArraySort(5);
            const {embed, pages} = this.#CreateEmbedMessage(message, List);

            //Запускаем ReactionMenu
            return new ReactionMenu(embed, message, ReactionMenu.Callbacks(1, pages, embed));
        }

        const command = message.client.commands.Array.find((command) => command.name === memberArg || command.aliases.includes(memberArg));

        //Отображаем одну команду
        if (command) {
            const {embed} = this.#CreateEmbedMessage(message, [[command]]);

            return messageUtils.sendMessage({text: embed, message, color: "DarkRed"});
        }

        //Если команды нет
        return messageUtils.sendMessage({text: `${message.author}, такой команд нет в моей базе!`, message, color: "DarkRed"});
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Создает Embed сообщение + pages
     * @param message
     * @param CommandsList
     */
    readonly #CreateEmbedMessage = (message: ClientMessage, CommandsList: Command[][]): { embed: EmbedConstructor, pages: string[] } => {
        const pages: string[] = [];
        const embed: EmbedConstructor = {
            title: "Help Menu",
            color: Colors.Yellow,
            thumbnail: { url: message.client.user.avatarURL() },
            timestamp: new Date()
        };

        //Преобразуем все команды в string
        CommandsList.forEach((s: any) => {
            const parsedCommand = s.map((command: Command) =>
                `Команда [**${command.name}**] | ${command.type}
                    **❯ Сокращения:** (${command.aliases.join(", ") ?? `Нет`})
                    **❯ Описание:** (${command.description ?? `Нет`})
                    **❯ Используется:** ${Bot.prefix}${command.name} ${command.usage}`
            ).join('\n\n');

            //Если parsedCommand не undefined, то добавляем его в pages
            if (parsedCommand !== undefined) pages.push(parsedCommand);
        });

        embed.description = pages[0];
        embed.footer = { text: `${message.author.username} | Лист 1 из ${pages.length}`, iconURL: message.author.displayAvatarURL() }

        return {embed, pages};
    };
}