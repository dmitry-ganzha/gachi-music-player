import {ApplicationCommand, CommandInteractionOption, GuildResolvable} from "discord.js";
import {CoolDownBase, isOwner} from './Message';
import {ClientInteraction, WatKLOK} from "../../Core/Client";
import {DurationUtils} from "../../Core/Player/Manager/DurationUtils";
import ParsingTimeToString = DurationUtils.ParsingTimeToString;

const CustomID = new Set(["skip", "resume_pause", "replay", "last"]);

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
        //

        setImmediate(() => {
            if (interaction.commandName || interaction.commandId) return RunCommand(client, interaction);
            else if (CustomID.has(interaction.customId) && client.queue.get(interaction.guildId)) {
                if (!interaction.member?.voice?.channel) return;
                return PlayerButtons(client, interaction);
            }
        });
    };
}

// Запускаем команду, выбранную пользователем из плеера
function PlayerButtons(client: WatKLOK, interaction: ClientInteraction) {
    const type = interaction.customId;
    const queue = client.queue.get(interaction.guildId);

    if (type === "resume_pause") {
        if (queue.player.state.status === "paused") return getCommand(client, "resume").run(interaction, []);
        else if (queue.player.state.status === "playing") return getCommand(client, "pause").run(interaction, []);
    }
    else if (type === "skip") return getCommand(client, "skip").run(interaction, []);
    else if (type === "replay") return getCommand(client, "replay").run(interaction, []);
    else if (type === "last") {
        if (!queue || !queue?.songs) return;
        if (queue.songs.length === 1) return queue.player.stop();

        // @ts-ignore
        const Array: any = queue.songs;
        const hasChange = Array[queue.songs.length - 1];

        Array[queue.songs.length - 1] = Array[0];
        Array[0] = hasChange;
        queue.player.stop();
    }
}

// Запускаем команду, выбранную пользователем
function RunCommand(client: WatKLOK, interaction: ClientInteraction) {
    let cmd = getCommand(client, interaction.commandName);

    if (cmd) return cmd.run(interaction, ParseArg(interaction?.options));
    return DeleteCommandInInteraction(client, interaction);
}


// Получаем команду из client.commands
function getCommand(client: WatKLOK, name: string) {
    return client.commands.get(name);
}

//Парсим аргументы выданные дискордом
function ParseArg(options: any) {
    return options?._hoistedOptions?.map((f: CommandInteractionOption) => f.value) || [""];
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