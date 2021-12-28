import {Command} from "../Constructor";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";
import {Message, MessageReaction, User} from "discord.js";
import {W_Message} from "../../Core/Utils/W_Message";

export default class CommandRestart extends Command {
    constructor() {
        super({
            name: 'restart',
            aliases: ["res"],
            description: 'Перезапуск плеера, очередь этого сервера будет потеряна',

            enable: true,
            slash: false
        })
    };

    public run = async (message: W_Message): Promise<any> => {
        this.DeleteMessage(message, 5e3);
        const queue: Queue = message.client.queue.get(message.guild.id);

        if (!queue) return message.client.Send({ text: `${message.author}, ⚠ | Музыка щас не играет.`, message: message, color: 'RED' });

        return message.channel.send({ embeds: [{ description: "**Очередь и плеер будут уничтожены!** \n**Музыка перезапустится только для этого сервера!**", color: "RED" }]}).then(async (msg: W_Message | Message) => (
            await this.createReaction(message, msg as W_Message, queue, "✅", () => (this.DeleteMessage(msg as W_Message, 5e3), queue.events.queue.emit('DestroyQueue', queue, message))),
            await this.createReaction(message, msg as W_Message, queue, "❎", () => this.DeleteMessage(msg as W_Message, 5e3)))
        )
    };

    private createReaction = (message: W_Message, msg: W_Message, queue: Queue, emoji: string, callback: Function) => msg.react(emoji).then(async () =>msg.createReactionCollector({filter: async (reaction: MessageReaction, user: User) => (reaction.emoji.name === emoji && user.id !== msg.client.user.id)}).on('collect', async () => callback()));
}