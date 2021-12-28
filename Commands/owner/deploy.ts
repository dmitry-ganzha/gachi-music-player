import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";

export default class CommandDeploy extends Command {
    constructor() {
        super({
            name: 'deploy',

            enable: true,
            isOwner: true,
            slash: false
        })
    };

    public run = async (message: W_Message): Promise<void> => {
        let commands = message.client.commands, TotalCommands: number = 0;
        try {
            commands.map(async (cmd: Command) => {
                if (cmd.isOwner || !cmd.slash || !cmd.enable) return;
                try {
                    await message.client.application.commands.set(cmd as any);
                } catch (e) {
                    await message.client.application.commands.create(cmd as any);
                }
                TotalCommands++;
            });
        } finally {
            await message.client.Send({ text: `${message.author}, [${TotalCommands}] команд загружено`, message: message });
        }
    };
}