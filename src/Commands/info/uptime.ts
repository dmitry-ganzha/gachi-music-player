import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {ParserTimeSong} from "../../Core/Player/Manager/Functions/ParserTimeSong";

export class CommandUptime extends Command {
    public constructor() {
        super({
            name: 'uptime',
            description: 'Мое время работы без перезагрузок',

            slash: true,
            enable: true
        })
    }
    public run = async (message: ClientMessage): Promise<void> => message.client.Send({text: `Uptime: ${ParserTimeSong(message.client.uptime / 1000)}`, message, type: 'css', color: "GREEN"});
}