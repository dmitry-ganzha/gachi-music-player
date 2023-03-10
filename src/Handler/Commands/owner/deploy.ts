import {Command, ResolveData} from "@Structures/Handle/Command";
import {ClientMessage} from "@Client/interactionCreate";

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

    public readonly run = (message: ClientMessage): ResolveData => {
        const {author, client} = message;
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

        return { text: `${author}, Load: [${TotalCommands}]` };
    };
}