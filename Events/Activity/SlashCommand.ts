import {Interaction} from "discord.js";
import {Command} from "../../Commands/Constructor";
import {W_Client, W_Message} from "../../Core/Utils/W_Message";

const CustomID = new Set(['skip', 'resume', 'pause', 'replay']);

export default class SlashCommand {
    public readonly name: string;
    public readonly enable: boolean;
    constructor() {
        this.name = "interactionCreate";
        this.enable = true;
    }
    public run = async (interaction: Interaction | any, f2: any, client: W_Client): Promise<void | any> => {
        await this.DeleteInteraction(interaction);
        await this.editInteraction(interaction);

        if (interaction.isCommand()) return this.runCommand(interaction, client)
        else if (CustomID.has(interaction.customId) && client.queue.get(interaction.guildId)) return this.ButtonsMessage(interaction, client);
    };
    private editInteraction = async (interaction: any): Promise<void> => {
        interaction.author = interaction.member.user;
        interaction.delete = async () => null;
    }
    private runCommand = async (interaction: any, client: W_Client): Promise<void | any> => {
        let cmd = await this._getCommand(client, interaction.commandName);
        if (cmd) return cmd.run(interaction, this._parseArgs(interaction));
        return this.DeleteIntegrationCommand(client, interaction);
    }
    private ButtonsMessage = async (interaction: any, client: W_Client): Promise<void | any> => {
        if (!interaction.member.voice.channel) return;
        return this.SkipPause(interaction.customId, client, interaction);
    }
    private _getCommand = (client: W_Client, name: string): Command => client.commands.get(name);
    private DeleteInteraction = async (interaction: any): Promise<NodeJS.Timeout> => setTimeout(async () => {
        interaction.deleteReply().catch(() => null);
        interaction.deferReply().catch(() => null);
    }, 200);
    private _parseArgs = (interaction: any): string[] => interaction.options._hoistedOptions.map((f: any) => f.value) || '';
    private DeleteIntegrationCommand = (client: W_Client, interaction: any): any => interaction.commandId ? client.application?.commands.delete(interaction.commandId) : null;

    //Buttons
    private SkipPause = async (type: string, client: W_Client, interaction: W_Message): Promise<void | any> => {
        if (type === 'skip') return this._getCommand(client, 'skip').run(interaction, []);
        else if (type === 'pause') return this._getCommand(client, 'pause').run(interaction, []);
        return this.ResumeReplay(type, client, interaction);
    }
    private ResumeReplay = async (type: string, client: W_Client, interaction: W_Message): Promise<void | any> => {
        if (type === 'resume') return this._getCommand(client, 'resume').run(interaction, []);
        else if (type === 'replay') return this._getCommand(client, 'replay').run(interaction, []);
    }
}