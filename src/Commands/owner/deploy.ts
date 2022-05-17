import {Command, TypeSlashCommand} from "../Constructor";
import {ClientMessage} from "../../Core/Client";

export class CommandDeploy extends Command {
    public constructor() {
        super({
            name: 'deploy',

            enable: true,
            isOwner: true,
            slash: false
        })
    };

    public run = (message: ClientMessage): void => {
        let TotalCommands: number = 0;
        message.client.commands.forEach((cmd: Command) => {
            if (cmd.isOwner || !cmd.slash) return null;
            TotalCommands++

            let CommandSlash: TypeSlashCommand = {
                name: cmd.name,
                description: cmd.description
            }

            if (cmd.options.length > 0) CommandSlash = {...CommandSlash, options: cmd.options};

            message.client.application.commands.create(CommandSlash as any).catch((err) => console.log(`[Command: ${cmd.name}]: ${err}`));
        });

        return message.client.Send({ text: `${message.author}, [${TotalCommands}] команд загружено`, message });
    }
}