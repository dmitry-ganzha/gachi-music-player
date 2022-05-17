import {Colors} from "../Colors";
import {ClientInteraction, ClientMessage} from "../../Client";
import {ColorResolvable, EmbedConstructor} from "../TypeHelper";

export type SendOptions = {
    text: string;
    color?: ColorResolvable | number;
    message: ClientMessage;
    type?: OptionsSendType;
}
type OptionsSendType =  "css" | "js" | "ts" | "cpp" | "html" | "cs";


export function MessageChannelSend(options: SendOptions): void {
    if (typeof options.type === 'string') return SendMessageCode(options);
    return SendMessageNoCode(options)
}

function SendMessageCode(options: SendOptions): void {
    return CatchMessage(options.message.channel.send({
        embeds: [MessageEmbed(options.color, `\`\`\`${options.type}\n${options.text}\n\`\`\``)],
    }));
}
function SendMessageNoCode(options: SendOptions): void {
    return CatchMessage(options.message.channel.send({
        embeds: [MessageEmbed(options.color, options.text)]
    }));
}

function CatchMessage(type: Promise<ClientMessage>): void {
    type.then((msg: ClientMessage) => setTimeout(() => msg.deletable ? msg.delete() : null, 12e3))
        .catch((err: Error) => console.log(`[Discord Error]: [Send message] ${err}`));

    return;
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