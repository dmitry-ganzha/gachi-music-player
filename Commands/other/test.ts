import {Command} from "../Constructor";
import {wMessage} from "../../Core/Utils/TypesHelper";

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
    }
}