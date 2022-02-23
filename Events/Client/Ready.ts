import cfg from "../../db/Config.json";
import {EmbedConstructor, wClient, wMessage} from "../../Core/Utils/TypesHelper";
import {Colors} from "../../Core/Utils/Colors";

export class Ready {
    public readonly name: string = "ready";
    public readonly enable: boolean = false;

    public run = async (f1: null, f2: null, client: wClient): Promise<null | wMessage> => {
        let channel = client.channels.cache.get(cfg.Channels.Start) as wMessage['channel'];

        if (channel && !client.shard) return channel.send({embeds: [MessageEmbed(client)]});
        return null;
    };
}

function MessageEmbed(client: wClient): EmbedConstructor {
    return {
        color: Colors.WHITE,
        description: `**${client.user}**: Starting...`,
        timestamp: new Date() as any,
        footer: {
            text: `${client.user.username}`,
            iconURL: client.user.displayAvatarURL(),
        }
    };
}