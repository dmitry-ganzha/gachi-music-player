import {Command} from "../../../Structures/Command";
import {MessageReaction, ReactionCollector, User} from "discord.js";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {Colors, GlobalUtils} from "../../../Core/Utils/LiteUtils";
import {ClientMessage} from "../../Events/Activity/Message";

export default class Restart extends Command {
    public constructor() {
        super({
            name: 'restart',
            aliases: ["res"],
            description: 'Перезапуск плеера, очередь этого сервера будет потеряна!',

            enable: true,
        });
    };

    public readonly run = (message: ClientMessage): Promise<ReactionCollector | boolean | void> | void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        //Если нет очереди
        if (!queue) return message.client.sendMessage({
            text: `${message.author}, ⚠ | Музыка щас не играет.`,
            message,
            color: "RED"
        });

        return message.channel.send({ embeds: [{ description: "**Очередь и плеер будут уничтожены!** \n**Музыка перезапустится только для этого сервера!**", color: Colors.RED }]}).then(async (msg: ClientMessage) => {
            this.#createReaction(msg, "✅", () => {
                GlobalUtils.DeleteMessage(msg, 5e3);
                message.client.queue.delete(message.guild.id);
            });
            this.#createReaction(msg, "❎", () => GlobalUtils.DeleteMessage(msg, 5e3));
        });
    };

    readonly #createReaction = (msg: ClientMessage, emoji: string, callback: Function): void => {
        msg.react(emoji).then(() => msg.createReactionCollector({filter: (reaction: MessageReaction, user: User) => (reaction.emoji.name === emoji && user.id !== msg.client.user.id)}).on("collect", () => callback()));
    };
}