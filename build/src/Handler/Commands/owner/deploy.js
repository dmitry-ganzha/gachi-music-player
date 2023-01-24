"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deploy = void 0;
const Command_1 = require("@Structures/Handle/Command");
class Deploy extends Command_1.Command {
    constructor() {
        super({
            name: "deploy",
            isEnable: true,
            isOwner: true,
            isSlash: false,
            isGuild: false
        });
    }
    ;
    run = (message) => {
        const { author, client } = message;
        let TotalCommands = 0;
        client.commands.Array.forEach((command) => {
            if (command.isOwner || !command.isSlash)
                return null;
            const SlashCommands = client.application.commands;
            let slashCommandData = { name: command.name, description: command.description };
            if (command.options.length > 0)
                slashCommandData = { ...slashCommandData, options: command.options };
            const slashCommand = SlashCommands.cache.get(slashCommandData.name);
            if (slashCommand)
                SlashCommands.edit(slashCommand, slashCommandData).catch((err) => console.log(`[Command: ${command.name}]: ${err}`));
            else
                SlashCommands.create(slashCommandData).catch((err) => console.log(`[Command: ${command.name}]: ${err}`));
            TotalCommands++;
        });
        return { text: `${author}, Load: [${TotalCommands}]` };
    };
}
exports.Deploy = Deploy;
