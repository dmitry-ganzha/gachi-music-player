import {ApplicationCommand, CommandInteractionOption, GuildResolvable, Interaction} from "discord.js";
import {CoolDownBase, Helper} from './Message';
import {WatKLOK} from "../../Core/Client";
import {ParserTimeSong} from "../../Core/Player/Manager/Duration/ParserTimeSong";

const CustomID = new Set(['skip', 'resume', 'pause', 'replay']);

export class SlashCommandN {
    public readonly name: string = "interactionCreate";
    public readonly enable: boolean = true;

    public run = (interaction: Interaction | any, f2: any, client: WatKLOK): Promise<void | NodeJS.Timeout> | void => {
        if (!interaction.guildId) return;

        DeleteInteraction(interaction);
        editInteraction(interaction);

        const CoolDownFind = CoolDownBase.get(interaction.user.id);

        //
        if (Helper.isOwner(null, interaction.author.id)) {
            if (CoolDownFind) return client.Send({ text: `${interaction.user.username}, Воу воу, ты слишком быстро вызываешь "Interaction". Подожди ${ParserTimeSong(CoolDownFind.time)}`, message: interaction, type: "css" });
            else {
                CoolDownBase.set(interaction.user.id, {
                    time: 10
                });
                setTimeout(() => CoolDownBase.delete(interaction.user.id), 10e3);
            }
        }
        //

        setImmediate(() => {
            if (interaction.isCommand()) return RunCommand(client, interaction);
            else if (CustomID.has(interaction.customId) && client.queue.get(interaction.guildId)) {
                if (!interaction.member.voice.channel) return;
                return PlayerButtons(client, interaction);
            }
        });
    };
}

// Запускаем команду, выбранную пользователем из плеера
function PlayerButtons(client: WatKLOK, interaction: any) {
    const type = interaction.customId;

    if (type === 'skip') return getCommand(client, 'skip').run(interaction, []);
    else if (type === 'pause') return getCommand(client, 'pause').run(interaction, []);
    if (type === 'resume') return getCommand(client, 'resume').run(interaction, []);
    else if (type === 'replay') return getCommand(client, 'replay').run(interaction, []);
}

// Запускаем команду, выбранную пользователем
function RunCommand(client: WatKLOK, interaction: any) {
    let cmd = getCommand(client, interaction.commandName);

    if (cmd) return cmd.run(interaction, ParseArg(interaction));
    return DeleteCommandInInteraction(client, interaction);
}


// Получаем команду из client.commands
function getCommand(client: WatKLOK, name: string) {
    return client.commands.get(name)
}

//Парсим аргументы выданные дискордом
function ParseArg(options: any) {
    return options._hoistedOptions.map((f: CommandInteractionOption) => f.value) || ''
}

// Удаляем через 200 мс взаимодействие
function DeleteInteraction(interaction: any) {
    return setTimeout(() => {
        interaction.deleteReply().catch((): null => null);
        interaction.deferReply().catch((): null => null);
    }, 200);
}

// Меняем взаимодействие под ClientMessage
function editInteraction(interaction: any): void {
    interaction.author = interaction.member.user;
    interaction.delete = (): null => null;
}

// Если нет такой команды удаляем из взаимодействия
function DeleteCommandInInteraction(client: WatKLOK, interaction: any): void | Promise<ApplicationCommand<{guild: GuildResolvable}>> {
    if (!interaction.commandId) return;

    return client.application?.commands.delete(interaction.commandId)
}