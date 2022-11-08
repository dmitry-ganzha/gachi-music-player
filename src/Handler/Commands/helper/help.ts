import {Command} from "../../../Structures/Command";
import {ReactionMenu} from "../../../Core/Utils/ReactionMenu";
import {Colors} from "discord.js";
import {ClientMessage, EmbedConstructor} from "../../Events/Activity/Message";
import {Bot} from "../../../../db/Config.json";

export class Help extends Command {
    public constructor() {
        super({
            name: "help",
            aliases: ["h"],
            description: "Можешь глянуть все мои команды!",
            usage: "all | command name",

            slash: true,
            enable: true,
            CoolDown: 35
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

            //Запускаем ReactionMenu
            return message.channel.send({embeds: [embed]});
        }

        //Если команды нет
        return message.client.sendMessage({text: `${message.author}, такой команд нет в моей базе!`, message, color: "DarkRed"});
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