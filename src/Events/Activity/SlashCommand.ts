import {BaseInteraction, CommandInteractionOption, GuildMember, User} from "discord.js";
import {WatKLOK} from "../../Core/Client/Client";
import {Event} from "../../Structures/Event";

export class SlashCommand extends Event<ClientInteraction, null>{
    public readonly name: string = "interactionCreate";
    public readonly enable: boolean = true;

    public readonly run = (interaction: ClientInteraction, f2: null, client: WatKLOK) => {
        if (!interaction.inGuild()) return; //Если это не сервер, игнорируем!

        DeleteInteraction(interaction);
        editInteraction(interaction);

        const {commandName, options} = interaction;

        if (interaction.isChatInputCommand()) {
            const Command = client.commands.get(commandName);
            const Args = options?._hoistedOptions?.map((f: CommandInteractionOption) => `${f.value}`) || [""];

            if (Command) Command.run(interaction, Args);
        }
    };
}
// Удаляем через 200 мс взаимодействие
function DeleteInteraction(interaction: ClientInteraction) {
    return setTimeout(() => {
        interaction.deleteReply().catch((): null => null);
        interaction.deferReply().catch((): null => null);
    }, 200);
}

// Меняем взаимодействие под ClientMessage
function editInteraction(interaction: ClientInteraction): void {
    interaction.author = interaction.member.user;
    interaction.delete = (): null => null;
}

/*
// Если нет такой команды удаляем из взаимодействия
function DeleteCommandInInteraction(client: WatKLOK, interaction: ClientInteraction): void | Promise<ApplicationCommand<{guild: GuildResolvable}>> {
    if (!interaction.commandId) return;

    return client.application?.commands.delete(interaction.commandId);
}
 */

// @ts-ignore
export interface ClientInteraction extends BaseInteraction {
    member: GuildMember;
    customId: string;
    commandName: string;
    commandId: string;
    author: User;
    options?: {
        _hoistedOptions: any[]
    }

    delete: () => void;
    deferReply: () => Promise<void>
    deleteReply: () => Promise<void>
}