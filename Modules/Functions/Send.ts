import {Message, MessageEmbed} from "discord.js";
import {SendOptions, W_Message} from "../../Core/Utils/W_Message";

export default class Send {
    public readonly enable: boolean;
    constructor() {
        this.enable = true;
    };
    public run = (client: W_Message["client"]): (options: SendOptions) => Promise<void> => client.Send = (options:  SendOptions): Promise<void> => typeof options.type === 'string' ? this.SendCode(options) : this.SendNotCode(options);
    private SendCode = async (options: SendOptions): Promise<void> => this.Catch(options.message.channel.send({
        embeds: [new Embed(options.color, `\`\`\`${options.type}\n${options.text}\n\`\`\``)],
    }));
    private SendNotCode = async (options: SendOptions): Promise<void> => this.Catch(options.message.channel.send({
        embeds: [new Embed(options.color, options.text)]
    }));
    private Catch = async (type: Promise<Message>): Promise<void> => {
        type.then(async (msg: W_Message | Message) => setTimeout(() => msg.delete().catch((err: Error) => console.log(`[Discord Error]: [Delete Message]: => ${err}`)), 12e3)
        ).catch((err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));
    };
}

class Embed extends MessageEmbed {
    constructor(color: any = '#03f0fc', text: string) {
        super({
            color: color,
            description: text
        });
    };
}