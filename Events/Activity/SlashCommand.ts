import {ApplicationCommand, CommandInteractionOption, GuildResolvable, Interaction} from "discord.js";
import {Command} from "../../Commands/Constructor";
import {wClient, wMessage} from "../../Core/Utils/TypesHelper";
import {CoolDownBase, Helper} from './Message';
import {ParserTimeSong} from "../../Modules/Music/src/Manager/Functions/ParserTimeSong";

const CustomID = new Set(['skip', 'resume', 'pause', 'replay']);

type ButtonsPlayer = "skip" | "pause" | "resume" | "replay";

export class SlashCommand {
    public readonly name: string = "interactionCreate";
    public readonly enable: boolean = true;

    /**
     * @description Default function
     * @param interaction {Interaction} Взаимодействие
     * @param f2 {any} null
     * @param client {wClient} Бот
     */
    public run = async (interaction: Interaction | any, f2: any, client: wClient): Promise<void | any> => {
        if (!interaction.guildId) return;

        await this.DeleteInteraction(interaction);
        await this.editInteraction(interaction);
        const CoolDownFind = CoolDownBase.get(interaction.user.id);

        if (Helper.isOwner(null, interaction.author.id)) {
            if (CoolDownFind) return client.Send({ text: `${interaction.user.username}, Воу воу, ты слишком быстро вызываешь "Interaction". Подожди ${ParserTimeSong(CoolDownFind.time)}`, message: interaction, type: "css" });
            else {
                CoolDownBase.set(interaction.user.id, {
                    time: 10
                });
                setTimeout(async () => CoolDownBase.delete(interaction.user.id), 10e3);
            }
        }

        setImmediate(async () => {
            if (interaction.isCommand()) return this.runCommand(interaction, client)
            else if (CustomID.has(interaction.customId) && client.queue.get(interaction.guildId)) return this.ButtonsMessage(interaction, client);
        });
    };
    /**
     * @description Редактируем взаимодействие для запуска любых команд
     * @param interaction {Interaction} Взаимодействие
     */
    protected editInteraction = async (interaction: any): Promise<void> => {
        interaction.author = interaction.member.user;
        interaction.delete = (): null => null;
    };
    /**
     * @description Ищем и запускаем команду (пока без прав)
     * @param interaction {Interaction} Взаимодействие
     * @param client {wClient} Бот
     */
    protected runCommand = async (interaction: any, client: wClient): Promise<void | any> => {
        let cmd = await this._getCommand(client, interaction.commandName);

        if (cmd) return cmd.run(interaction, this._parseArgs(interaction));
        return this.DeleteIntegrationCommand(client, interaction);
    };
    /**
     * @description Проверка автор взаимодействия в VoiceChannel
     * @param interaction {Interaction} Взаимодействие
     * @param client {wClient} Бот
     */
    protected ButtonsMessage = async (interaction: any, client: wClient): Promise<void | any> => {
        if (!interaction.member.voice.channel) return;

        return this.SkipPause(interaction.customId, client, interaction);
    };
    protected _getCommand = (client: wClient, name: string): Command => client.commands.get(name);
    protected DeleteInteraction = async (interaction: any): Promise<NodeJS.Timeout> => setTimeout(async () => {
        interaction.deleteReply().catch((): null => null);
        interaction.deferReply().catch((): null => null);
    }, 200);
    protected _parseArgs = ({options}: any): string[] => options._hoistedOptions.map((f: CommandInteractionOption) => f.value) || '';
    protected DeleteIntegrationCommand = (client: wClient, interaction: any): Promise<ApplicationCommand<{guild: GuildResolvable}>> => interaction.commandId ? client.application?.commands.delete(interaction.commandId) : null;

    //Buttons (skip, pause, resume, replay)
    protected SkipPause = async (type: ButtonsPlayer, client: wClient, interaction: wMessage): Promise<void | unknown> => {
        if (type === 'skip') return this._getCommand(client, 'skip').run(interaction, []);
        else if (type === 'pause') return this._getCommand(client, 'pause').run(interaction, []);
        return this.ResumeReplay(type, client, interaction);
    };
    protected ResumeReplay = async (type: ButtonsPlayer, client: wClient, interaction: wMessage): Promise<void | any> => {
        if (type === 'resume') return this._getCommand(client, 'resume').run(interaction, []);
        else if (type === 'replay') return this._getCommand(client, 'replay').run(interaction, []);
    };
}