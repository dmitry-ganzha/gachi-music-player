import cfg from "../../../DataBase/Config.json";
import {ClientMessage, WatKLOK} from "../../Core/Client";
import {EmbedConstructor, MessageChannel} from "../../Core/Utils/TypeHelper";
import {Colors} from "../../Core/Utils/LiteUtils";

export class Ready {
    public readonly name: string = "ready";
    public readonly enable: boolean = false;

    public run = (f1: null, f2: null, client: WatKLOK): Promise<ClientMessage> | null => {
        let channel = client.channels.cache.get(cfg.Channels.Start) as MessageChannel;

        if (channel && !client.shard) return channel.send({embeds: [MessageEmbed(client)]});
        return null;
    };
}

function MessageEmbed(client: WatKLOK): EmbedConstructor {
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