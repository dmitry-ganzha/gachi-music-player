import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {EmbedConstructor} from "../../Core/Utils/TypeHelper";
import {Colors} from "../../Core/Utils/LiteUtils";

export class CommandEval extends Command {
    public constructor() {
        super({
            name: "eval",

            enable: true,
            isOwner: true,
            slash: false
        })
    };

    public readonly run = (message: ClientMessage, args: string[]): void => {
        let code: string = args.join(" "),
            StartTime: number = new Date().getMilliseconds(),
            RunEval: any;

        try {
            RunEval = eval(code);
            this.#MessageSend(message, RunEval, Colors.GREEN, "[Status: Work]", code, StartTime);
        } catch (err) {
            this.#MessageSend(message, err.code ? err.code : err, Colors.RED, "[Status: Fail]", code, StartTime);
            message.client.console(`[EVAL]: [ERROR: ${err.code ? err.code : err}]`);
        }
    };
    #MessageSend = (message: ClientMessage, response: string, color: number, type: string, code: string, StartTime: number): void => {
        const EndTime = new Date().getMilliseconds();
        let embed: EmbedConstructor = {
            color,
            title: `${type === "Fail" ? `❌ ${type}` : `✅ ${type}`}\n`,
            fields: [
                {
                    name: "Input Code:",
                    value: `\`\`\`js\n${code}\n\`\`\``,
                    inline: false
                },
                {
                    name: "Output Code:",
                    value: `\`\`\`js\n${response}\`\`\``,
                    inline: false
                }
            ],
            footer: {
                text: `Time: ${EndTime - StartTime} ms`
            }
        }
        message.channel.send({embeds: [embed]}).then((msg: ClientMessage) => Command.DeleteMessage(msg, 30e3));
    };
}