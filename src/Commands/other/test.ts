import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {YouTube} from "../../Core/Platforms";

export class CommandTest extends Command {
    public constructor() {
        super({
            name: 'test',

            enable: false,
            isOwner: true,
            slash: false
        })
    };
    public run = async (message: ClientMessage, args: string[]) => {
        const Video = await YouTube.getVideo(args[0]);

        console.log(Video)
    };
}