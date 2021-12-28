import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";
import {YouTube} from "../../Core/SPNK";

export default class CommandTest extends Command {
    constructor() {
        super({
            name: 'test',

            enable: true,
            isOwner: true,
            slash: false
        })
    };

    public run = async (message: W_Message, args: string[]): Promise<void> => {
    };
}