import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";

export class CommandTest extends Command {
    public constructor() {
        super({
            name: 'test',

            enable: false,
            isOwner: true,
            slash: false
        })
    };
    public run = (message: ClientMessage, args: string[]) => {
    };
}