import {Command} from "../Constructor";
import {ClientMessage} from "../../Core/Client";
import {ParserTimeSong} from "../../Core/Player/Manager/Duration/ParserTimeSong";

export class CommandUptime extends Command {
    public constructor() {
        super({
            name: 'uptime',
            description: 'Время без рестартов!',

            slash: true,
            enable: true
        })
    }
    public run = (message: ClientMessage): void => message.client.Send({text: `Uptime: ${ParserTimeSong(message.client.uptime / 1000)}`, message, type: 'css', color: "GREEN"});
}