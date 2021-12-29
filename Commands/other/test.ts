import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";

export default class CommandTest extends Command {
    constructor() {
        super({
            name: 'test',

            enable: false,
            isOwner: true,
            slash: false
        })
    };

    public run = async (message: W_Message, args: string[]): Promise<void> => {
    };
}