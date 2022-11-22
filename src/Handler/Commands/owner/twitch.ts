import {Command} from "../../../Structures/Command";
import {ClientMessage, EmbedConstructor} from "../../Events/Activity/interactiveCreate";
import {Colors} from "discord.js";

export class Twitch extends Command {
    public constructor() {
        super({
            name: "twitch",

            isEnable: true,
            isOwner: true,
            isSlash: false,
            isGuild: false
        });
    };

    public readonly run = (message: ClientMessage, args: string[]): void => {
        const embed: EmbedConstructor = {
            color: Colors.Purple,
            author: {
                name: "KHELBERG",
                iconURL: "https://cdn.discordapp.com/attachments/1016995045783633940/1038115302749245520/a0830726-9e62-49c6-81d1-9e0bba450147-profile_image-70x70.png"
            },
            description: `Стрим запущен! Можно посмотреть тут [TWITCH](https://www.twitch.tv/khelberg)\nКомментарий от стримера: ${args.join(" ") ?? "Нету"}`,
            image: { url: "https://lh3.googleusercontent.com/drive-viewer/AJc5JmSFEDCzXEG0o8z0s817_unlcXX2xW3010GZaxC6_Y_eRpTqKh_BteLL6tB3aalDjBs2B1lZ4bXcTU5_skAPrfMC6yMC=w1365-h929" },
            timestamp: new Date()
        };
        const channel = message.client.channels.cache.get("975443278868643911") as ClientMessage["channel"];


        if (channel) channel.send({embeds: [embed]});
    };
}