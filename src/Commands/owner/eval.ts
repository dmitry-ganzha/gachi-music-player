import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {Colors} from "../../Core/Utils/Colors";
import {EmbedConstructor} from "../../Core/Utils/TypeHelper";

export class CommandEval extends Command {
    public constructor() {
        super({
            name: 'eval',

            enable: true,
            isOwner: true,
            slash: false
        })
    };

    public run = async (message: ClientMessage, args: string[]): Promise<NodeJS.Timeout | void> => {
        let code: string = args.join(" "),
            StartTime: number = new Date().getMilliseconds(),
            RunEval: any;

        try {
            RunEval = eval(code);
            return CommandEval.MessageSend(message, RunEval, Colors.GREEN, '[Status: Work]', code, StartTime);
        } catch (err) {
            await CommandEval.MessageSend(message, err.code ? err.code : err, Colors.RED, '[Status: Fail]', code, StartTime);
            return message.client.console(`[EVAL]: [ERROR: ${err.code ? err.code : err}]`);
        }
    };
    protected static MessageSend = (message: ClientMessage, response: string, color: number, type: string, code: string, StartTime: number): Promise<NodeJS.Timeout> => {
        const EndTime = new Date().getMilliseconds();
        let embed: EmbedConstructor = {
            color,
            title: `${type === 'Fail' ? `❌ ${type}` : `✅ ${type}`}\n`,
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
        return message.channel.send({embeds: [embed]}).then(async (msg: ClientMessage) => setTimeout(async () => msg.deletable ? msg.delete().catch(null) : null, 10000));
    };
}