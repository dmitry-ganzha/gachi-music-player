import {MessageEmbed} from "discord.js";
import {CollectorSortReaction} from "../../Core/Utils/CollectorArraySort";
import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";

export default class CommandHelp extends Command {
    constructor() {
        super({
            name: 'help',
            aliases: ["h"],
            description: 'Все мои команды',

            enable: true
        })
    };

    public run = async (message: W_Message): Promise<void> => {
        this.DeleteMessage(message, 5e3);
        const commands = message.client.commands, fakeCommands: Command[] = [];

        commands.map((cmd: Command) => !cmd.isOwner ? fakeCommands.push(cmd) : null);

        // @ts-ignore
        let List: Command[] = fakeCommands.ArraySort(5);
        let data = this.CreateEmbedMessage(message, List);

        return new CollectorSortReaction()._run(data.embed, data.pages, data.page, message, false);
    };
    private CreateEmbedMessage = (message: W_Message, List: Command[]): { embed: MessageEmbed, pages: any[], page: number } => {
        let helpEmbed = new MessageEmbed().setTitle("Help Menu").setColor("#0cff00").setThumbnail(message.client.user.avatarURL({format: 'png', dynamic: true, size: 1024})).setTimestamp();
        let pages: any = [], page: any = 1, i;

        List.forEach((s: any) => {
            i = s.map((cmd: Command) => (
                `Команда [**${cmd.name}**]  
                    **❯ Сокращения:** ${cmd.aliases ? `(${cmd.aliases})` : `(Нет)`} 
                    **❯ Описание:** ${cmd.description ? `(${cmd.description})` : `(Нет)`}`
            )).join('\n\n');
            if (i !== undefined) pages.push(i)
        });

        helpEmbed.setDescription(pages[page - 1]);
        helpEmbed.setFooter(`${message.author.username} | Лист 1 из ${pages.length}`, message.author.displayAvatarURL());
        return {
            embed: helpEmbed,
            pages: pages,
            page: page
        };
    };
}