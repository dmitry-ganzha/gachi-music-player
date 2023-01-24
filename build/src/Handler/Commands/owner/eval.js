"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Eval = void 0;
const Command_1 = require("@Structures/Handle/Command");
const discord_js_1 = require("discord.js");
class Eval extends Command_1.Command {
    constructor() {
        super({
            name: "eval",
            aliases: ["el", "code", "js"],
            isEnable: true,
            isOwner: true,
            isSlash: false,
            isGuild: false
        });
    }
    ;
    run = (message, args) => {
        const queue = message.client.queue.get(message.guild.id);
        const StartMs = new Date().getMilliseconds();
        const Code = args.join(" ");
        const resolve = (Eval, EndMs, color) => {
            return { color, footer: { text: `Time: ${EndMs - StartMs} ms` }, fields: [
                    { name: "Input Code:", value: `\`\`\`js\n${Code}\n\`\`\``, inline: false },
                    { name: "Output Code:", value: `\`\`\`js\n${Eval}\`\`\``, inline: false }
                ]
            };
        };
        try {
            const EvalCode = eval(Code);
            const EndMs = new Date().getMilliseconds();
            return { embed: resolve(EvalCode, EndMs, discord_js_1.Colors.Green) };
        }
        catch (e) {
            const EndMs = new Date().getMilliseconds();
            return { embed: resolve(e, EndMs, discord_js_1.Colors.Red) };
        }
    };
}
exports.Eval = Eval;
