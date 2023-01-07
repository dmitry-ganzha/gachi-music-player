import {Command, ResolveData} from "@Structures/Handle/Command";
import {ClientMessage} from "@Client/interactionCreate";
import {httpsClient} from "@httpsClient";

export class Deploy extends Command {
    public constructor() {
        super({
            name: "test",

            isEnable: true,
            isOwner: true,
            isSlash: false,
            isGuild: false
        });
    };

    public readonly run = (message: ClientMessage): any => {
        httpsClient.parseBody("https://music.yandex.ru/search?text=Alan%20walker&type=tracks").then((body) => {
            const trackInfo = body.split("\">var Mu=")[1].split(";</script><script src=\"https:")[0];

            console.log(JSON.parse(trackInfo).pageData.result.tracks.items[0],`\n\n\n\n\n${body}`); //pageData.result.tracks[0]
        });
    };
}
/*
<a href="/album/13707793/track/40032220" class="d-track__title deco-link deco-link_stronger">  Call Out My Name  </a>
 */