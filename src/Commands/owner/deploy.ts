import {Command, TypeSlashCommand} from "../Constructor";
import {ClientMessage} from "../../Core/Client";

export class CommandDeploy extends Command {
    public constructor() {
        super({
            name: "deploy",

            enable: true,
            isOwner: true,
            slash: false
        });
    };

    public readonly run = (message: ClientMessage): void => message.client.Send({
        text: `${message.author}, [${this.#createSlashCommand(message)}] команд загружено`,
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
            if (command.isOwner || !command.slash) return null;

            let CommandSlash: TypeSlashCommand = {
                name: command.name,
                description: command.description
            }

            if (command.options.length > 0) CommandSlash = {...CommandSlash, options: command.options};

            message.client.application.commands.create(CommandSlash as any).catch((err) => console.log(`[Command: ${command.name}]: ${err}`));
            TotalCommands++;
        });

        return TotalCommands;
    };
}