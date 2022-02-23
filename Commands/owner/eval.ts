import {Embed, StageChannel, VoiceChannel} from "discord.js";
import {Command} from "../Constructor";
import {wMessage} from "../../Core/Utils/TypesHelper";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Structures/Queue";
import {Colors} from "../../Core/Utils/Colors";

export class CommandEval extends Command {
    public constructor() {
        super({
            name: 'eval',

            enable: true,
            isOwner: true,
            slash: false
        })
    };

    public run = async (message: wMessage, args: string[]): Promise<NodeJS.Timeout | void> => {
        let code: string = args.join(" "),
            queue: Queue = message.client.queue.get(message.guild.id),
            voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel,
            StartTime: number = new Date().getMilliseconds(),
            RunEval: any;

        try {
            RunEval = eval(code);
            return CommandEval.MessageSend(message, RunEval, Colors.GREEN, '[Status: Work]', code, StartTime);
        } catch (err) {
            await CommandEval.MessageSend(message, err.code ? err.code : err, Colors.RED, '[Status: Fail]', code, StartTime);
            return message.client.console(`[EVAL]: [ERROR: ${err.code ? err.code : err}]`);
        }
    };
    protected static MessageSend = (message: wMessage, response: string, color: number, type: string, code: string, StartTime: number): Promise<NodeJS.Timeout> => {
        let embed = new Embed()
            .setTitle(`${type === 'Fail' ? `❌ ${type}` : `✅ ${type}`}\n`)
            .setColor(color)
            .addField({name: "Input Code:", value: `\`\`\`js\n${code}\n\`\`\``, inline: false})
            .addField({name: "Output Code:", value: `\`\`\`js\n${response}\`\`\``, inline: false})
        const EndTime = new Date().getMilliseconds();

            embed.setFooter({text: `Time: ${EndTime - StartTime} ms`})
        return message.channel.send({embeds:[embed]}).then(async (msg: any) => setTimeout(async () => msg.deletable ? msg.delete().catch(null) : null, 10000));
    };
}