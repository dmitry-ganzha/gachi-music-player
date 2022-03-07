import {Command} from "../Constructor";
import {AsyncParserTimeSong} from "../../Modules/Music/src/Manager/Functions/ParserTimeSong";
import {wMessage} from "../../Core/Utils/TypesHelper";

export class CommandUptime extends Command {
    public constructor() {
        super({
            name: 'uptime',
            description: 'Мое время работы без перезагрузок',

            slash: true,
            enable: true
        })
    }
    public run = async (message: wMessage): Promise<void> => message.client.Send({text: `Uptime: ${await AsyncParserTimeSong(message.client.uptime / 1000)}`, message, type: 'css', color: "GREEN"});
}