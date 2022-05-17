import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {Colors} from "../../Core/Utils/Colors";
import {EmbedConstructor} from "../../Core/Utils/TypeHelper";

const ChannelID = "975443278868643911";

export class CommandTwitch extends Command {
    public constructor() {
        super({
            name: 'twitch',

            enable: true,
            isOwner: true,
            slash: false
        })
    };

    public run = (message: ClientMessage, args: string[]) => {
        const Channel = message.client.channels.cache.get(ChannelID) as ClientMessage["channel"];

        const Embed: EmbedConstructor = {
            author: {
                name: "Alexandr_Helberg - TWITCH",
                url: "https://www.twitch.tv/alexandr_helberg",
                iconURL: "https://static-cdn.jtvnw.net/jtv_user_pictures/e345cb4f-5349-4669-9c6d-94bd0fcd71b3-profile_image-70x70.png"
            },
            description: `Описание:\n${args.join(" ") ?? "Без описания"}`,
            color: Colors.PURPLE,
            timestamp: new Date()
        };

        return Channel.send({embeds: [Embed]});
    };
}