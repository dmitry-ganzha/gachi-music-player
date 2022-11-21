import {BaseInteraction, CommandInteractionOption, GuildMember, User} from "discord.js";
import {WatKLOK} from "../../../Core/Client/Client";
import {Event} from "../../../Structures/Event";
import {ClientMessage} from "./Message";

export class SlashCommand extends Event<ClientInteraction, null> {
    public readonly name: string = "interactionCreate";
    public readonly enable: boolean = true;

    public readonly run = (interaction: ClientInteraction, _: null, client: WatKLOK) => {
        if (!interaction.inGuild()) return; //Если это не сервер, игнорируем!

        editInteraction(interaction);

        const {commandName, options} = interaction;

        if (interaction.isChatInputCommand()) {
            const Command = client.commands.get(commandName);
            const Args = options?._hoistedOptions?.map((f: CommandInteractionOption) => `${f.value}`) || [""];

            if (Command) Command.run(interaction, Args);
            else DeleteCommandInInteraction(client, interaction);
        }
    };
}
// Меняем взаимодействие под ClientMessage
function editInteraction(interaction: ClientInteraction): void {
    interaction.author = interaction.member.user;
    interaction.delete = (): null => null;
}
// Если нет такой команды удаляем из взаимодействия
function DeleteCommandInInteraction(client: WatKLOK, interaction: ClientInteraction): void {
    if (!interaction.commandId) return;

    client.application?.commands.delete(interaction.commandId);
}

export interface ClientInteraction extends BaseInteraction {
    client: WatKLOK;
    member: GuildMember; customId: string; commandName: string; commandId: string; author: User;
    delete: () => void; deferReply: () => Promise<void>; deleteReply: () => Promise<void>; options?: { _hoistedOptions: any[] };
    reply: ClientMessage["channel"]["send"] & {fetchReply?: boolean};
}