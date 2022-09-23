import {Command} from "../../../Structures/Command";
import {ReactionMenu} from "../../../Core/Utils/ReactionMenu";
import {Colors} from "discord.js";
import {ClientMessage, EmbedConstructor} from "../../Events/Activity/Message";

export default class Help extends Command {
    public constructor() {
        super({
            name: "help",
            aliases: ["h"],
            description: "Можешь глянуть все мои команды!",

            slash: true,
            enable: true,
            CoolDown: 35
        });
    };

    public readonly run = (message: ClientMessage): void => {
        const Commands: Command[] = message.client.commands.Array.filter((command) => !command.isOwner);

        // @ts-ignore
        let List: Command[] = Commands.ArraySort(5);
        let {embed, pages} = this.#CreateEmbedMessage(message, List);

        //Запускаем CollectorSortReaction
        new ReactionMenu(embed, message, ReactionMenu.Callbacks(1, pages, embed));
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Создает Embed сообщение + pages
     * @param message
     * @param CommandsList
     * @private
     */
    readonly #CreateEmbedMessage = (message: ClientMessage, CommandsList: Command[]): { embed: EmbedConstructor, pages: any[] } => {
        const pages: string[] = [];
        const embed: EmbedConstructor = {
            title: "Help Menu",
            color: Colors.Yellow,
            thumbnail: {
                url: message.client.user.avatarURL()
            },
            timestamp: new Date()
        };

        //Преобразуем все команды в string
        CommandsList.forEach((s: any) => {
            const parsedCommand = s.map((command: Command) =>
                `Команда [**${command.name}**]  
                    **❯ Сокращения:** ${command.aliases ? `(${command.aliases})` : `(Нет)`} 
                    **❯ Описание:** ${command.description ? `(${command.description})` : `(Нет)`}`
            ).join('\n\n');

            //Если parsedCommand не undefined, то добавляем его в pages
            if (parsedCommand !== undefined) pages.push(parsedCommand);
        });

        embed.description = pages[0];
        embed.footer = {text: `${message.author.username} | Лист 1 из ${pages.length}`, iconURL: message.author.displayAvatarURL()}

        return { embed, pages };
    };
}