import {Embed, ReactionCollector} from "discord.js";
import {CollectorSortReaction} from "../../Core/Utils/CollectorArraySort";
import {Command} from "../Constructor";
import {wMessage} from "../../Core/Utils/TypesHelper";
import {Colors} from "../../Core/Utils/Colors";

export class CommandHelp extends Command {
    public constructor() {
        super({
            name: 'help',
            aliases: ["h"],
            description: 'Все мои команды',

            slash: true,
            enable: true,
            CoolDown: 35
        })
    };

    public run = async (message: wMessage): Promise<ReactionCollector | void> => {
        const commands = message.client.commands, fakeCommands: Command[] = [];

        commands.map((cmd: Command) => !cmd.isOwner ? fakeCommands.push(cmd) : null);

        // @ts-ignore
        let List: Command[] = fakeCommands.ArraySort(5);
        let {embed, page, pages} = CommandHelp.CreateEmbedMessage(message, List);

        return new CollectorSortReaction()._run(embed, pages, page, message, false);
    };
    protected static CreateEmbedMessage = (message: wMessage, List: Command[]): { embed: Embed, pages: any[], page: number } => {
        const helpEmbed = new Embed().setTitle("Help Menu").setColor(Colors.YELLOW).setThumbnail(message.client.user.avatarURL()).setTimestamp();
        let pages: string[] = [], page: any = 1, i;

        List.forEach((s: any) => {
            i = s.map((cmd: Command) => (
                `Команда [**${cmd.name}**]  
                    **❯ Сокращения:** ${cmd.aliases ? `(${cmd.aliases})` : `(Нет)`} 
                    **❯ Описание:** ${cmd.description ? `(${cmd.description})` : `(Нет)`}`
            )).join('\n\n');
            if (i !== undefined) pages.push(i)
        });

        helpEmbed.setDescription(pages[page - 1]);
        helpEmbed.setFooter({text: `${message.author.username} | Лист 1 из ${pages.length}`, iconURL: message.author.displayAvatarURL()});
        return {
            embed: helpEmbed,
            pages: pages,
            page: page
        };
    };
}