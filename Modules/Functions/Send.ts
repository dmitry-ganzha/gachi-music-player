import {ColorResolvable, EmbedConstructor, SendOptions, wClient, wMessage} from "../../Core/Utils/TypesHelper";
import {Colors} from "../../Core/Utils/Colors";

export class Send {
    public readonly enable: boolean = true;

    public run = (client: wClient): (options: SendOptions) => Promise<void> => client.Send = (options: SendOptions): Promise<void> => typeof options.type === 'string' ? this.SendCode(options) : this.SendNotCode(options);
    protected SendCode = async (options: SendOptions): Promise<void> => this.Catch(options.message.channel.send({
        embeds: [MessageEmbed(options.color, `\`\`\`${options.type}\n${options.text}\n\`\`\``)],
    }));
    protected SendNotCode = async (options: SendOptions): Promise<void> => this.Catch(options.message.channel.send({
        embeds: [MessageEmbed(options.color, options.text)]
    }));
    protected Catch = async (type: Promise<wMessage>): Promise<void> => {
        type.then(async (msg: wMessage) => setTimeout(() => msg.deletable ? msg.delete().catch((err: Error) => console.log(`[Discord Error]: [Delete Message] -> ${err}`)) : null, 12e3)
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