import cfg from "../../../DataBase/Config.json";
import {Colors} from "../../Core/Utils/Colors";
import {ClientMessage, WatKLOK} from "../../Core/Client";
import {EmbedConstructor} from "../../Core/Utils/TypeHelper";

export class Ready {
    public readonly name: string = "ready";
    public readonly enable: boolean = false;

    public run = async (f1: null, f2: null, client: WatKLOK): Promise<null | ClientMessage> => {
        let channel = client.channels.cache.get(cfg.Channels.Start) as ClientMessage['channel'];

        if (channel && !client.shard) return channel.send({embeds: [await MessageEmbed(client)]});
        return null;
    };
}

async function MessageEmbed(client: WatKLOK): Promise<EmbedConstructor> {
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