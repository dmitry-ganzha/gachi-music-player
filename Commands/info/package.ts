import {Command} from "../Constructor";
import {EmbedConstructor, wMessage} from "../../Core/Utils/TypesHelper";
import packageJson from "../../package.json"
import {Colors} from "../../Core/Utils/Colors";

export class CommandPackage extends Command {
    public constructor() {
        super({
            name: 'package',
            aliases: ['pack'],
            description: 'Все используемые пакеты',

            enable: true
        })
    };

    public run = async (message: wMessage): Promise<void | NodeJS.Timeout> => message.channel.send({embeds: [CommandPackage.CreateEmbed()]}).then(async (msg: wMessage | any) => Command.DeleteMessage(msg, 25e3)).catch((err: Error) => console.log(`[Discord Error]: [Send message]: ${err}`));
    protected static CreateEmbed = (): EmbedConstructor => {
        let base = '';

        for (const [key, value] of Object.entries(packageJson.dependencies)) base += `• ${key}: ${value}\n`;
        return MessageEmbed(base);
    };
}

function MessageEmbed(base: string): EmbedConstructor {
    return {
        description: `\`\`\`css\n${base}\`\`\``,
        color: Colors.YELLOW
    }
}