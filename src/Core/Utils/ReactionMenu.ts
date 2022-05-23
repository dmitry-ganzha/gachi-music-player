import {MessageReaction, ReactionCollector, User} from "discord.js";
import {EmbedConstructor} from "./TypeHelper";
import {ClientMessage} from "../Client";
import {Queue} from "../Player/Structures/Queue/Queue";
import {FullTimeSongs} from "../Player/Manager/Duration/FullTimeSongs";

const emojis = {
    back: "⬅️",
    up: "➡️",
    cancel: "❌"
}

export class CollectorSortReaction {
    /**
     * @description Создаем menu emoji
     * @param embed { EmbedConstructor | string } MessageEmbed или текст
     * @param pages {any[]} ArraySort данные
     * @param page {number} Текущая страница
     * @param message {ClientMessage} Сообщение с сервера
     * @param EnableQueue {boolean} Добавляем сколько музыки есть в очереди
     */
    public _run = (embed: EmbedConstructor | string, pages: string[], page: number, message: ClientMessage, EnableQueue: boolean): void => {
        const queue: Queue = message.client.queue.get(message.guild.id);

        setImmediate(() => {
            const Callbacks = typeof embed === "string" ? CallbackString(page, pages, queue) : CallbackEmbed(page, pages, embed, queue, EnableQueue);

            message.channel.send(typeof embed === "string" ? embed : {embeds: [embed]}).then((msg) => {
                // @ts-ignore
                Object.entries(Callbacks).forEach(([key, value]) => reaction(message.author, message, msg, value, emojis[key]));
            });
        });
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Удаляем сообщение
 * @param msg {ClientMessage} Сообщение
 */
function DeleteMessage(msg: ClientMessage): void {
    msg.deletable ? msg.delete().catch(() => null) : null;
}
//====================== ====================== ====================== ======================
/**
 * @description Создание реакции
 * @param user {User} Пользователь
 * @param message {ClientMessage} Сообщение
 * @param msg {ClientMessage} Сообщение
 * @param callback {Function} Выполняем функцию реакции
 * @param emoji {string} Смайл
 */
function reaction(user: User, message: ClientMessage, msg: ClientMessage, callback: Function, emoji: string): Promise<ReactionCollector> {
    return msg.react(emoji).then(() => msg.createReactionCollector({filter: (reaction: MessageReaction, user: User) => filter(emoji, reaction, user, message), time: 1e4 * 25})
        .on('collect', (reaction: MessageReaction): Promise<ReactionCollector> => callback(reaction, user, message, msg))).catch(() => undefined);
}
//====================== ====================== ====================== ======================
/**
 * @description Проверяем пользователь использовал смайл и пользователь не бот
 * @param emoji {string} Смайл
 * @param reaction {MessageReaction} Реакция пользователя
 * @param user {User} Пользователь
 * @param message {ClientMessage} Сообщение
 */
function filter(emoji: string, reaction: MessageReaction, user: User, message: ClientMessage) {
    return (reaction.emoji.name === emoji && user.id !== message.client.user.id);
}
//====================== ====================== ====================== ======================
/**
 * @description 3 функции для текстовой menu emoji
 * @param page {number} Текущая страница
 * @param pages {any[]} ArraySort данные
 * @param queue {Queue} Очередь
 */
function CallbackString(page: number, pages: string[], queue: Queue) {
    return {
        back: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
            setImmediate(() => {
                users.remove(user);

                if (page === 1) return null;
                page--;
                return msg.edit(`\`\`\`css\n➡️ | Current playing -> [${queue.songs[0].title}]\n\n${pages[page - 1]}\n\n${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}\`\`\``);
            });
        },
        cancel: (reaction: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
            setImmediate(() => {
                [msg, message].forEach((mes) => DeleteMessage(mes));
            });
        },
        up: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
            setImmediate(() => {
                users.remove(user);

                if (page === pages.length) return null;
                page++;
                return msg.edit(`\`\`\`css\n➡️ | Current playing -> [${queue.songs[0].title}]\n\n${pages[page - 1]}\n\n${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}\`\`\``);
            });
        }
    };
}
//====================== ====================== ====================== ======================
/**
 * @description 3 функции для messageEmbed menu emoji
 * @param page {number} Текущая страница
 * @param pages {any[]} ArraySort данные
 * @param embed {MessageEmbed} MessageEmbed
 * @param queue {Queue} Очередь
 * @param EnableQueue {boolean} Добавляем сколько музыки есть в очереди
 */
function CallbackEmbed(page: number, pages: string[], embed: EmbedConstructor, queue: Queue, EnableQueue: boolean) {
    return {
        back: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
            setImmediate(() => {
                users.remove(user);

                if (page === 1) return null;
                page--;
                embed = {...embed, description: pages[page - 1]};
                if (EnableQueue) embed = {...embed,
                    footer: {
                        text: `${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length}`,
                        iconURL: message.author.displayAvatarURL()
                    }
                };
                else embed = {...embed,
                    footer: {
                        text: `${message.author.username} | Лист ${page} из ${pages.length}`,
                        iconURL: message.author.displayAvatarURL()
                    }
                };
                return msg.edit({embeds: [embed]});
            });
        },
        cancel: (reaction: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
            setImmediate(() => {
                [msg, message].forEach((mes) => DeleteMessage(mes));
            });
        },
        up: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage): void => {
            setImmediate(() => {
                users.remove(user);

                if (page === pages.length) return null;
                page++;

                embed = {...embed, description: pages[page - 1]};
                if (EnableQueue) embed = {...embed,
                    footer: {
                        text: `${message.author.username} | ${FullTimeSongs(queue)} | Лист ${page} из ${pages.length}`,
                        iconURL: message.author.displayAvatarURL()
                    }
                };
                else embed = {...embed,
                    footer: {
                        text: `${message.author.username} | Лист ${page} из ${pages.length}`,
                        iconURL: message.author.displayAvatarURL()
                    }
                };
                return msg.edit({embeds: [embed]});
            });
        }
    };
}