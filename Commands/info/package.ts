import {Command} from "../Constructor";
import {MessageEmbed} from "discord.js";
import {W_Message} from "../../Core/Utils/W_Message";
import * as packageJson from "../../package.json"

export default class CommandPackage extends Command {
    constructor() {
        super({
            name: 'package',
            aliases: ['pack'],
            description: 'Все используемые пакеты',

            enable: true
        })
    };

    public run = async (message: W_Message): Promise<unknown> => message.channel.send({embeds: [this.CreateEmbed()]}).then(async (msg: W_Message | any) => (this.DeleteMessage(msg, 25e3), this.DeleteMessage(message, 5e3))).catch((err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));

    private CreateEmbed = (): MessageEmbed => {
        let packages = {
             names: Object.keys(packageJson.dependencies),
             versions: Object.values(packageJson.dependencies)
        }, base = '';

        for (let i in packages.names) base += `• ${packages.names[i]}: ${packages.versions[i]}\n`
        return new Embed(base);
    }
}

class Embed extends MessageEmbed {
    constructor(base) {
        super({
            description: `\`\`\`css\n${base}\`\`\``,
            color: "YELLOW"
        });
    }
}