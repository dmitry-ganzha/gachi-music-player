import {ApplicationCommand, GuildResolvable} from "discord.js";
import {CoolDownBase, isOwner} from './Message';
import {ClientInteraction, WatKLOK} from "../../Core/Client";
import {DurationUtils} from "../../Core/Player/Manager/DurationUtils";
import ParsingTimeToString = DurationUtils.ParsingTimeToString;

export class SlashCommand {
    public readonly name: string = "interactionCreate";
    public readonly enable: boolean = true;

    public readonly run = (interaction: ClientInteraction, f2: any, client: WatKLOK): Promise<void | NodeJS.Timeout> | void => {
        if (!interaction.guildId) return;

        DeleteInteraction(interaction);
        editInteraction(interaction);

        const CoolDownFind = CoolDownBase.get(interaction.author.id);

        //
        if (isOwner(null, interaction.author.id)) {
            if (CoolDownFind) return client.Send({ text: `${interaction.author.username}, Воу воу, ты слишком быстро вызываешь "Interaction". Подожди ${ParsingTimeToString(CoolDownFind.time)}`, message: interaction as any, type: "css" });
            else {
                CoolDownBase.set(interaction.author.id, {
                    time: 10
                });
                setTimeout(() => CoolDownBase.delete(interaction.author.id), 10e3);
            }
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

// Если нет такой команды удаляем из взаимодействия
function DeleteCommandInInteraction(client: WatKLOK, interaction: ClientInteraction): void | Promise<ApplicationCommand<{guild: GuildResolvable}>> {
    if (!interaction.commandId) return;

    return client.application?.commands.delete(interaction.commandId);
}