import {ClientMessage, EmbedConstructor} from "@Client/interactionCreate";
import {YouTube, Spotify} from "@APIs";
import {Command, ResolveData} from "@Structures/Handle/Command";
import {consoleTime} from "@Client/Client";
import {Colors} from "discord.js";

export class Eval extends Command {
    public constructor() {
        super({
            name: "eval",

            isEnable: true,
            isOwner: true,
            isSlash: false,
            isGuild: false
        });
    };

    public readonly run = (message: ClientMessage, args: string[]): ResolveData => {
        const {client, member, guild, channel, user} = message;
        const queue = client.queue.get(guild.id);

        const UserCode = args.join(" ");
        const StartMs = new Date().getMilliseconds();

        try {
            const EvalExecute = eval(UserCode);
            const EndMs = new Date().getMilliseconds();
            const EmbedData = this.#getEmbed(EvalExecute, Colors.Green, UserCode, StartMs, EndMs);
            return {embed: EmbedData};
        } catch (err) {
            const EndMs = new Date().getMilliseconds();
            const EmbedData = this.#getEmbed(err, Colors.Red, UserCode, StartMs, EndMs);

            consoleTime(`[EVAL ERROR]: ${err}`);
            return {embed: EmbedData};
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем Embed <EmbedConstructor>
     * @param response {string} Выходная строка кода
     * @param color {number} Цвет embed
     * @param code {string} Входная строка кода
     * @param StartTime {number} Время старта обработки кода
     * @param EndTime {number} Время окончания обработки кода
     * @private
     */
    readonly #getEmbed = (response: string, color: number, code: string, StartTime: number, EndTime: number): EmbedConstructor => {
        return { color, fields:
                [
                    { name: "Input Code:", value: `\`\`\`js\n${code}\n\`\`\``, inline: false },
                    { name: "Output Code:", value: `\`\`\`js\n${response}\`\`\``, inline: false }
                ],
            footer: { text: `Time: ${EndTime - StartTime} ms` }
        };
    };
}