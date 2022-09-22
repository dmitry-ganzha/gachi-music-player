import {Command} from "../../../Structures/Command";
import {ReactionMenu} from "../../../Core/Utils/ReactionMenu";
import {Colors, MessageReaction, User} from "discord.js";
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
        new ReactionMenu(embed, message, this.#Callbacks(1, pages, embed));
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
    //====================== ====================== ====================== ======================
    /**
     * @description Функции для управления <CollectorSortReaction>
     * @param page {number} С какой страницы начнем
     * @param pages {Array<string>} страницы
     * @param embed {EmbedConstructor} Json<Embed>
     * @private
     */
    readonly #Callbacks = (page: number, pages: string[], embed: EmbedConstructor) => {
        return {
            //При нажатии на 1 эмодзи, будет выполнена эта функция
            back: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
                setImmediate(() => {
                    users.remove(user).catch((err) => console.log(err));

                    if (page === 1) return null;
                    page--;
                    embed = {...embed, description: pages[page - 1],
                        footer: {
                            ...embed.footer,
                            text: `${message.author.username} | Лист ${page} из ${pages.length}`
                        }
                    };

                    return msg.edit({embeds: [embed]});
                });
            },
            //При нажатии на 2 эмодзи, будет выполнена эта функция
            cancel: (reaction: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
                setImmediate(() => {
                    [msg, message].forEach((mes) => mes.deletable ? mes.delete().catch(() => null) : null);
                });
            },
            //При нажатии на 3 эмодзи, будет выполнена эта функция
            next: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
                setImmediate(() => {
                    users.remove(user).catch((err) => console.log(err));

                    if (page === pages.length) return null;
                    page++;

                    embed = {...embed, description: pages[page - 1],
                        footer: {
                            ...embed.footer,
                            text: `${message.author.username} | Лист ${page} из ${pages.length}`
                        }
                    };

                    return msg.edit({embeds: [embed]});
                });
            }
        };
    };
}