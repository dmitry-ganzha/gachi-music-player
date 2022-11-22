import {Command} from "../../../Structures/Command";
import {ClientMessage, EmbedConstructor} from "../../Events/Activity/interactiveCreate";
import {messageUtils} from "../../../Core/Utils/LiteUtils";
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

    public readonly run = (message: ClientMessage, args: string[]): void => {
        const queue = message.client.queue.get(message.guild.id);
        const client = message.client;

        const UserCode = args.join(" ");
        const StartMs = new Date().getMilliseconds();

        try {
            const EvalExecute = eval(UserCode);
            const EndMs = new Date().getMilliseconds();
            const EmbedData = this.#getEmbed(EvalExecute, Colors.Green, "[Status: Work]", UserCode, StartMs, EndMs);
            return this.#SendMessage(message, EmbedData);
        } catch (err) {
            const EndMs = new Date().getMilliseconds();
            const EmbedData = this.#getEmbed(err, Colors.Red, "[Status: Fail]", UserCode, StartMs, EndMs);

            message.client.console(`[EVAL ERROR]: ${err}`);
            return this.#SendMessage(message, EmbedData);
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем код в тестовый канал
     * @param message {ClientMessage} Сообщение
     * @param Embed {EmbedConstructor} Сам embed
     * @private
     */
    readonly #SendMessage = (message: ClientMessage, Embed: EmbedConstructor) => {
        message.channel.send({embeds: [Embed]}).then((msg: ClientMessage) => messageUtils.deleteMessage(msg, 30e3));
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем Embed <EmbedConstructor>
     * @param response {string} Выходная строка кода
     * @param color {number} Цвет embed
     * @param type {string} Тип embed сообщения
     * @param code {string} Входная строка кода
     * @param StartTime {number} Время старта обработки кода
     * @param EndTime {number} Время окончания обработки кода
     * @private
     */
    readonly #getEmbed = (response: string, color: number, type: string, code: string, StartTime: number, EndTime: number): EmbedConstructor => {
        return {
            color,
            title: `${type === "[Status: Fail]" ? `❌ ${type}` : `✅ ${type}`}`,
            fields: [
                {
                    name: "Input Code:",
                    value: `\`\`\`js\n${code}\n\`\`\``,
                    inline: false
                },
                {
                    name: "Output Code:",
                    value: `\`\`\`js\n${response}\`\`\``,
                    inline: false
                }
            ],
            footer: {
                text: `Time: ${EndTime - StartTime} ms`
            }
        };
    };
}