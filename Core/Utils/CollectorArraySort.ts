import {FullTimeSongs} from "../../Modules/Music/src/Manager/Functions/FullTimeSongs";
import {Message, MessageEmbed, MessageReaction, ReactionCollector, User} from "discord.js";
import {W_Message} from "./W_Message";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";

export class CollectorSortReaction {
    public _run = async (embed: MessageEmbed | string, pages: [] | any, page: number, message: W_Message, EnableQueue: boolean): Promise<any> => message.channel.send(typeof embed === "string" ? embed : {embeds: [embed]}).then(async (msg: W_Message | Message) => {
        let user: User = message.author, queue: Queue = message.client.queue.get(message.guild.id);

        setTimeout(async () => msg.delete().catch(() => null), 120000);
        let type: CollectorSortReactionFunction = await this._type(embed, page, pages, queue, EnableQueue);
        return (await this._reaction(user, message, msg as W_Message, type.back, "⬅️"), await this._reaction(user, message, msg as W_Message, type.cancel, "❌"), await this._reaction(user, message, msg as W_Message, type.up, "➡️"));
    })
    private _callback_string = async (page: number, pages: [], queue: Queue): Promise<CollectorSortReactionFunction> => {
        return {
            back: async ({users}: MessageReaction, user: User, message: W_Message, msg: W_Message): Promise<NodeJS.Timeout> => {
                await users.remove(user);
                return setTimeout(async () => {
                    if (page === 1) return null;
                    page--;
                    return msg.edit(`\`\`\`css\n➡️ | Current playing [${queue.songs[0].title}]\n\n${pages[page - 1]}\n\n${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}\`\`\``);
                }, 150)
            },
            cancel: async (reaction: MessageReaction, user: User, message: W_Message, msg: W_Message): Promise<NodeJS.Timeout> => setTimeout(async () => (await this.DeleteMessage(msg), await this.DeleteMessage(message)), 50),
            up: async ({users}: MessageReaction, user: User, message: W_Message, msg: W_Message): Promise<NodeJS.Timeout> => {
                await users.remove(user);
                return setTimeout(async () => {
                    if (page === pages.length) return null;
                    page++;
                    return msg.edit(`\`\`\`css\n➡️ | Current playing [${queue.songs[0].title}]\n\n${pages[page - 1]}\n\n${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}\`\`\``);
                }, 150)
            }
        };
    }
    private _callbacks_embed = async (page: number, pages: [], embed: MessageEmbed, queue: Queue, EnableQueue: boolean): Promise<CollectorSortReactionFunction> => {
        return {
            back: async ({users}: MessageReaction, user: User, message: W_Message, msg: W_Message): Promise<NodeJS.Timeout> => {
                await users.remove(user);
                return setTimeout(async () => {
                    if (page === 1) return null;
                    page--;
                    embed.setDescription(pages[page - 1]);
                    if (EnableQueue) embed.setFooter(`${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length}`, message.author.displayAvatarURL());
                     else embed.setFooter(`${message.author.username} | Лист ${page} из ${pages.length}`, message.author.displayAvatarURL());
                    return msg.edit({embeds: [embed]});
                }, 150);
            },
            cancel: async (reaction: MessageReaction, user: User, message: W_Message, msg: W_Message): Promise<NodeJS.Timeout> => setTimeout(async () => (await this.DeleteMessage(msg), await this.DeleteMessage(message)), 50),
            up: async ({users}: MessageReaction, user: User, message: W_Message, msg: W_Message): Promise<NodeJS.Timeout> => {
                await users.remove(user);
                return setTimeout(async () => {
                    if (page === pages.length) return null;
                    page++;
                    embed.setDescription(pages[page - 1]);
                    if (EnableQueue) embed.setFooter(`${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length}`, message.author.displayAvatarURL());
                    else embed.setFooter(`${message.author.username} | Лист ${page} из ${pages.length}`, message.author.displayAvatarURL());
                    return msg.edit({embeds: [embed]});
                }, 150);
            }
        };
    };
    private _type = async (embed: MessageEmbed | string, page: number, pages: [], queue: Queue, EnableQueue: boolean): Promise<CollectorSortReactionFunction> => typeof embed === "string" ? this._callback_string(page, pages, queue) : this._callbacks_embed(page, pages, embed, queue, EnableQueue);
    private _reaction = async (user: User, message: W_Message, msg: W_Message, callback: Function, emoji: string): Promise<ReactionCollector> => msg.react(emoji).then(async () => msg.createReactionCollector({filter: async (reaction: MessageReaction, user: User) => this._filter(emoji, reaction, user, message)})
        .on('collect', async (reaction: MessageReaction): Promise<ReactionCollector> => callback(reaction, user, message, msg))).catch(() => undefined);
    private _filter = (emoji: string, reaction: MessageReaction, user: User, message: W_Message): boolean => (reaction.emoji.name === emoji && user.id !== message.client.user.id);
    private DeleteMessage = (msg: W_Message): Promise<W_Message> => msg.delete().catch(() => null);
}


interface CollectorSortReactionFunction {
    cancel: (reaction: MessageReaction, user: User, message: W_Message, msg: W_Message) => Promise<NodeJS.Timeout>
    back: (reaction: MessageReaction, user: User, message: W_Message, msg: W_Message) => Promise<NodeJS.Timeout>
    up: (reaction: MessageReaction, user: User, message: W_Message, msg: W_Message) => Promise<NodeJS.Timeout>
}
