import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {EmbedConstructor} from "../../Core/Utils/TypeHelper";
import {CollectorSortReaction} from "../../Core/Utils/ReactionMenu";
import {Colors} from "../../Core/Utils/LiteUtils";

export class CommandHelp extends Command {
    public constructor() {
        super({
            name: "help",
            aliases: ["h"],
            description: "Можешь глянуть все мои команды!",

            slash: true,
            enable: true,
            CoolDown: 35
        })
    };

    public run = (message: ClientMessage): void => {
        const Commands: Command[] = message.client.commands.Array;

        // @ts-ignore
        let List: Command[] = Commands.ArraySort(5);
        let {embed, page, pages} = this.#CreateEmbedMessage(message, List);

        return new CollectorSortReaction()._run(embed, pages, page, message, false);
    };
    #CreateEmbedMessage = (message: ClientMessage, List: Command[]): { embed: EmbedConstructor, pages: any[], page: number } => {
        let helpEmbed: EmbedConstructor = {
            title: "Help Menu",
            color: Colors.YELLOW,
            thumbnail: {
                url: message.client.user.avatarURL()
            },
            timestamp: new Date()
        };
        let pages: string[] = [], page: any = 1, i;

        List.forEach((s: any) => {
            i = s.map((cmd: Command) => (
                `Команда [**${cmd.name}**]  
                    **❯ Сокращения:** ${cmd.aliases ? `(${cmd.aliases})` : `(Нет)`} 
                    **❯ Описание:** ${cmd.description ? `(${cmd.description})` : `(Нет)`}`
            )).join('\n\n');
            if (i !== undefined) pages.push(i)
        });

        helpEmbed = {...helpEmbed, description: pages[page - 1], footer: {text: `${message.author.username} | Лист 1 из ${pages.length}`, iconURL: message.author.displayAvatarURL()}};

        return {
            embed: helpEmbed, pages, page
        };
    };
}