import {Command} from "../Constructor";
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

    public run = (message: ClientMessage): Promise<void> => new Promise((resolve: any) => {
        let TotalCommands: number = 0;
        message.client.commands.Array.map(async (cmd: Command) => {
            if (cmd.isOwner || !cmd.slash) return;
            TotalCommands++
            try {
                await message.client.application.commands.set(cmd as any);
            } catch {
                await message.client.application.commands.create(cmd as any);
            }
        });
        return resolve(message.client.Send({ text: `${message.author}, [${TotalCommands}] команд загружено`, message }));
    });
}