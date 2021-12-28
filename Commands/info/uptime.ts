import {Command} from "../Constructor";
import {ParserTimeSong} from "../../Modules/Music/src/Manager/Functions/ParserTimeSong";
import {W_Message} from "../../Core/Utils/W_Message";

export default class CommandUptime extends Command {
    constructor() {
        super({
            name: 'uptime',
            description: 'Мое время работы без перезагрузок',

            enable: true
        })
    }
    public run = async (message: W_Message): Promise<void> => message.client.Send({text: `Uptime: ${ParserTimeSong(message.client.uptime / 1000)}`, message: message, type: 'css', color: 'GREEN'});
}