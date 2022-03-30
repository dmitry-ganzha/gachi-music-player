import {Command} from "../Constructor";
import {wMessage} from "../../Core/Utils/TypesHelper";
import {YouTube} from "../../Core/SPNK";

export class CommandTest extends Command {
    public constructor() {
        super({
            name: 'test',

            enable: true,
            isOwner: true,
            slash: false
        })
    };
    public run = async (message: wMessage, args: string[]) => {
        const Video = await YouTube.getVideo(args[0]);

        console.log(Video)
    };
}