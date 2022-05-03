import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";

export class CommandTest extends Command {
    public constructor() {
        super({
            name: 'test',

            enable: true,
            isOwner: true,
            slash: false
        })
    };
    public run = async (message: ClientMessage, args: string[]) => {
    };
}