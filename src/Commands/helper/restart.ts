import {Command} from "../Constructor";
import {MessageReaction, ReactionCollector, User} from "discord.js";
import {ClientMessage} from "../../Core/Client";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {Colors} from "../../Core/Utils/LiteUtils";

export class CommandRestart extends Command {
    public constructor() {
        super({
            name: 'restart',
            aliases: ["res"],
            description: 'Перезапуск плеера, очередь этого сервера будет потеряна!',

            enable: true,
        });
    };

    public run = (message: ClientMessage): Promise<ReactionCollector | boolean | void> | void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!queue) return message.client.Send({ text: `${message.author}, ⚠ | Музыка щас не играет.`, message, color: "RED" });

        return message.channel.send({ embeds: [{ description: "**Очередь и плеер будут уничтожены!** \n**Музыка перезапустится только для этого сервера!**", color: Colors.RED }]}).then(async (msg: ClientMessage) => {
            this.#createReaction(msg, "✅", () => {
                Command.DeleteMessage(msg, 5e3);
                message.client.queue.delete(message.guild.id);
            });
            this.#createReaction(msg, "❎", () => Command.DeleteMessage(msg, 5e3));
        });
    };

    #createReaction = (msg: ClientMessage, emoji: string, callback: Function): void => {
        msg.react(emoji).then(() => msg.createReactionCollector({filter: (reaction: MessageReaction, user: User) => (reaction.emoji.name === emoji && user.id !== msg.client.user.id)}).on("collect", () => callback()));
    };
}