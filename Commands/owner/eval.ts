import {ColorResolvable, MessageEmbed, StageChannel, VoiceChannel} from "discord.js";
import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";

export default class CommandEval extends Command {
    constructor() {
        super({
            name: 'eval',

            enable: true,
            isOwner: true,
            slash: false
        })
    };

    public run = async (message: W_Message, args: string[]): Promise<void> => {
        let code: string = args.join(" "),
            queue: Queue = message.client.queue.get(message.guild.id),
            voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel,
            StartTime: number = new Date().getMilliseconds(),
            evaled: any;

        try {
            evaled = eval(code);
            return this.MessageSend(message, evaled, 'GREEN', '[Status: Work]', code, StartTime);
        } catch (err) {
            this.MessageSend(message, err.code ? err.code : err, 'RED', '[Status: Fail]', code, StartTime);
            return message.client.console(`[EVAL]: [ERROR: ${err.code ? err.code : err}]`);
        }
    };
    private MessageSend = (message: W_Message, response: string, color: ColorResolvable, type: string, code: string, StartTime: number) => {
        let embed = new MessageEmbed()
            .setTitle(`${type === 'Fail' ? `❌ ${type}` : `✅ ${type}`}\n`)
            .setColor(color)
            .addField("Input Code:", `\`\`\`js\n${code}\n\`\`\``, false)
            .addField("Output Code:", `\`\`\`js\n${response}\`\`\``, false)
        let EndTime = new Date().getMilliseconds();

            embed.setFooter(`Time: ${EndTime - StartTime} ms`)
        return message.channel.send({embeds:[embed]}).then(async (msg: any) => {
            setTimeout(async () => msg.delete().catch(() => null), 10000);
        });
    };
}