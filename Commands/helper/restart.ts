import {Command} from "../Constructor";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Structures/Queue";
import {Message, MessageReaction, ReactionCollector, User} from "discord.js";
import {wMessage} from "../../Core/Utils/TypesHelper";
import {Colors} from "../../Core/Utils/Colors";

export class CommandRestart extends Command {
    public constructor() {
        super({
            name: 'restart',
            aliases: ["res"],
            description: 'Перезапуск плеера, очередь этого сервера будет потеряна',

            enable: true,
        })
    };

    public run = async (message: wMessage): Promise<ReactionCollector | boolean | void> => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!queue) return message.client.Send({ text: `${message.author}, ⚠ | Музыка щас не играет.`, message: message, color: "RED" });

        return message.channel.send({ embeds: [{ description: "**Очередь и плеер будут уничтожены!** \n**Музыка перезапустится только для этого сервера!**", color: Colors.RED }]}).then(async (msg: wMessage | Message) => {
            await CommandRestart.createReaction(message, msg as wMessage, queue, "✅", (): boolean => {
                Command.DeleteMessage(msg as wMessage, 5e3);
                return void queue.events.queue.emit('DestroyQueue', queue, message);
            })
            await CommandRestart.createReaction(message, msg as wMessage, queue, "❎", () => Command.DeleteMessage(msg as wMessage, 5e3))
        });
    };
    protected static createReaction = (message: wMessage, msg: wMessage, queue: Queue, emoji: string, callback: Function) => msg.react(emoji).then(async () => msg.createReactionCollector({filter: async (reaction: MessageReaction, user: User) => (reaction.emoji.name === emoji && user.id !== msg.client.user.id)}).on('collect', async () => callback()));
}