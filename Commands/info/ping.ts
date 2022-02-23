import {Command} from "../Constructor";
import {EmbedConstructor, wMessage} from "../../Core/Utils/TypesHelper";
import {Colors} from "../../Core/Utils/Colors";

export class CommandPing extends Command {
    public constructor() {
        super({
            name: "ping",
            description: "Проверка отклика сообщения",

            slash: true,
            enable: true
        })
    };

    public run = async (message: wMessage): Promise<void> => message.channel.send('Pinging...').then(async (m: wMessage): Promise<void> => {
        const EMBED: EmbedConstructor = {
            description: `Latency is **${Date.now() - message.createdTimestamp < 0 ? 2 : Date.now() - message.createdTimestamp}** ms\nAPI Latency is **${Math.round(message.client.ws.ping < 0 ? 2 : message.client.ws.ping)}** ms`,
            color: Colors.YELLOW
        }

        m.edit({embeds: [EMBED]}).then(async (msg: wMessage) => Command.DeleteMessage(msg as wMessage, 12e3));
    }).catch(async (err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));
}