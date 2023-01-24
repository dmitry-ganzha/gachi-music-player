"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Radio = void 0;
const Command_1 = require("@Structures/Handle/Command");
class Command_Radio extends Command_1.Command {
    constructor() {
        super({
            name: "radio",
            aliases: ["rm"],
            description: "Режим радио!",
            permissions: {
                user: ["Administrator"],
                client: ["Speak", "Connect"]
            },
            isEnable: true,
            isSlash: true
        });
    }
    ;
    run = (message) => {
        const { author, guild, client } = message;
        const queue = client.queue.get(guild.id);
        if (!queue)
            return { text: `${author}, ⚠ | Музыка щас не играет.`, color: "DarkRed" };
        queue.options.radioMode = !queue.options.radioMode;
        return { text: `${author}, 📻 | RadioMode: ${queue.options.radioMode}`, color: "Green" };
    };
}
exports.Command_Radio = Command_Radio;
