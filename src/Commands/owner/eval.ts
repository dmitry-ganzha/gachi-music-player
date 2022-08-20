import {Command} from "../../Structures/Command";
import {EmbedConstructor} from "../../Core/Utils/TypeHelper";
import {Colors} from "../../Core/Utils/LiteUtils";
import {ClientMessage} from "../../Events/Activity/Message";

export default class Eval extends Command {
    public constructor() {
        super({
            name: "eval",

            enable: true,
            isOwner: true,
            slash: false
        });
    };

    public readonly run = (message: ClientMessage, args: string[]): void => {
        const UserCode = args.join(" ");
        const StartMs = new Date().getMilliseconds();

        try {
            const EvalExecute = eval(UserCode);
            const EndMs = new Date().getMilliseconds();
            const EmbedData = this.#getEmbed(EvalExecute, Colors.GREEN, "[Status: Work]", UserCode, StartMs, EndMs);
            return this.#SendMessage(message, EmbedData);
        } catch (err) {
            const EndMs = new Date().getMilliseconds();
            const EmbedData = this.#getEmbed(err, Colors.RED, "[Status: Fail]", UserCode, StartMs, EndMs);

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
        message.channel.send({embeds: [Embed]}).then((msg: ClientMessage) => Command.DeleteMessage(msg, 30e3));
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