"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Send = void 0;
const Colors_1 = require("../../Core/Utils/Colors");
class Send {
    constructor() {
        this.enable = true;
        this.run = (client) => client.Send = (options) => typeof options.type === 'string' ? this.SendCode(options) : this.SendNotCode(options);
        this.SendCode = async (options) => this.Catch(options.message.channel.send({
            embeds: [MessageEmbed(options.color, `\`\`\`${options.type}\n${options.text}\n\`\`\``)],
        }));
        this.SendNotCode = async (options) => this.Catch(options.message.channel.send({
            embeds: [MessageEmbed(options.color, options.text)]
        }));
        this.Catch = async (type) => {
            type.then(async (msg) => setTimeout(() => msg.deletable ? msg.delete().catch((err) => console.log(`[Discord Error]: [Delete Message] -> ${err}`)) : null, 12e3)).catch((err) => console.log(`[Discord Error]: [Send message] ${err}`));
        };
    }
}
exports.Send = Send;
function MessageEmbed(color = 'BLUE', description) {
    return {
        color: typeof color === "number" ? color : ConvertColor(color), description
    };
}
function ConvertColor(color) {
    let colorOut;
    try {
        colorOut = Colors_1.Colors[color];
    }
    catch {
        return Colors_1.Colors.BLUE;
    }
    return colorOut;
}
