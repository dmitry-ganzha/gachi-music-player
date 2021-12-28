import {Command} from "../Constructor";
import {Message, MessageEmbed} from "discord.js";
import {W_Message} from "../../Core/Utils/W_Message";

export default class CommandPing extends Command {
    constructor() {
        super({
            name: "ping",
            description: "Проверка отклика сообщения",

            enable: true
        })
    };

    public run = async (message: W_Message): Promise<void> => message.channel.send('Pinging...').then(async (m: W_Message | Message): Promise<void> => {
        this.DeleteMessage(message, 5e3);
        let embed = new MessageEmbed()
            .setDescription(`Latency is **${Date.now() - message.createdTimestamp < 0 ? 2 : Date.now() - message.createdTimestamp}** ms\nAPI Latency is **${Math.round(message.client.ws.ping < 0 ? 2 : message.client.ws.ping)}** ms`)
            .setColor("RANDOM")
        m.edit({embeds: [embed]}).then(async (msg: any) => this.DeleteMessage(msg, 12e3));
    }).catch(async (err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));
}