import cfg from "../../db/Config.json";
import {MessageEmbed, TextChannel} from "discord.js";
import {W_Message} from "../../Core/Utils/W_Message";

export default class Ready {
    public readonly name: string;
    public readonly enable: boolean;
    constructor() {
        this.name = "ready";
        this.enable = true;
    };

    public run = async (f1: Event, f2: Event, client: W_Message["client"]): Promise<any> => {
        let channel = client.channels.cache.get(cfg.Channels.Start) as TextChannel;

        if (channel) return channel.send({embeds: [new Embed(client)]});
        return null;
    };
}
class Embed extends MessageEmbed {
    constructor(client) {
        super({
            color: "WHITE",
            description: `**${client.user}**: Starting...`,
            timestamp: new Date(),
            footer: {
                text: `${client.user.username}`,
                icon_url: client.user.displayAvatarURL(),
            }
        })
    };
}