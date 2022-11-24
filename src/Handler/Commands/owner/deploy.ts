import {Command, messageUtils} from "../../../Structures/Handle/Command";
import {ClientMessage} from "../../Events/Activity/interactiveCreate";

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

    public readonly run = (message: ClientMessage): void => messageUtils.sendMessage({
        text: `${message.author}, Load: [${this.#createSlashCommand(message)}]`,
        message
    });
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем данные на сервера discord о SlashCommand
     * @param message {ClientMessage} Сообщение
     * @private
     */
    readonly #createSlashCommand = (message: ClientMessage) => {
        let TotalCommands: number = 0;

        message.client.commands.Array.forEach((command) => {
            if (command.isOwner || !command.isSlash) return null;
            const SlashCommands = message.client.application.commands;
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