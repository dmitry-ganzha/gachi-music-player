import {Command, ResolveData} from "../../../Structures/Handle/Command";
import {ClientMessage} from "../../Events/Activity/interactionCreate";
import {WatKLOK} from "../../../Core/Client/Client";

export class Deploy extends Command {
    public constructor() {
        super({
            name: "deploy",

            isEnable: true,
            isOwner: true,
            isSlash: false,
            isGuild: false
        });
    };

    public readonly run = async (message: ClientMessage): Promise<ResolveData> => {
        const {author, client} = message;
        return { text: `${author}, Load: [${this.#createSlashCommand(client)}]` };
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем данные на сервера discord о SlashCommand
     * @param client {WatKLOK} Клиент
     * @private
     */
    readonly #createSlashCommand = (client: WatKLOK) => {
        let TotalCommands: number = 0;

        client.commands.Array.forEach((command) => {
            if (command.isOwner || !command.isSlash) return null;
            const SlashCommands = client.application.commands;
            let slashCommandData: any = { name: command.name, description: command.description };

            if (command.options.length > 0) slashCommandData = {...slashCommandData, options: command.options};

            const slashCommand = SlashCommands.cache.get(slashCommandData.name);

            if (slashCommand) SlashCommands.edit(slashCommand, slashCommandData).catch((err) => console.log(`[Command: ${command.name}]: ${err}`));
            else SlashCommands.create(slashCommandData as any).catch((err) => console.log(`[Command: ${command.name}]: ${err}`));

            TotalCommands++;
        });

        return TotalCommands;
    };
}