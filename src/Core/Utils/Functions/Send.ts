import {Colors} from "../Colors";
import {ClientMessage} from "../../Client";
import {ColorResolvable, EmbedConstructor} from "../TypeHelper";

export type SendOptions = {
    text: string;
    color?: ColorResolvable | number;
    message: ClientMessage;
    type?: OptionsSendType;
}
type OptionsSendType =  "css" | "js" | "ts" | "cpp" | "html" | "cs";


export class Send {
    public run = (options: SendOptions): void => typeof options.type === 'string' ? this.SendCode(options) : this.SendNotCode(options);

    protected SendCode = (options: SendOptions): void => this.Catch(options.message.channel.send({
        embeds: [MessageEmbed(options.color, `\`\`\`${options.type}\n${options.text}\n\`\`\``)],
    }));

    protected SendNotCode = (options: SendOptions): void => this.Catch(options.message.channel.send({
        embeds: [MessageEmbed(options.color, options.text)]
    }));

    protected Catch = (type: Promise<ClientMessage>): void => {
        type.then((msg: ClientMessage) => setTimeout(() => msg.deletable ? msg.delete().catch((err: Error) => console.log(`[Discord Error]: [Delete Message] -> ${err}`)) : null, 12e3)
        ).catch((err: Error) => console.log(`[Discord Error]: [Send message] ${err}`));
    };
}

function MessageEmbed(color: ColorResolvable | number = 'BLUE', description: string): EmbedConstructor {
    return {
        color: typeof color === "number" ? color : ConvertColor(color), description
    }
}
function ConvertColor(color: ColorResolvable): number | null {
    let colorOut;
    try {
        // @ts-ignore
        colorOut = Colors[color];
    } catch {
        return Colors.BLUE;
    }

    return colorOut;
}