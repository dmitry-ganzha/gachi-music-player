"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CollectorSortReaction = void 0;
const DurationUtils_1 = require("../Player/Manager/DurationUtils");
const emojis = {
    back: "⬅️",
    up: "➡️",
    cancel: "❌"
};
class CollectorSortReaction {
    constructor() {
        this._run = (embed, pages, page, message, EnableQueue) => {
            const queue = message.client.queue.get(message.guild.id);
            setImmediate(() => {
                const Callbacks = typeof embed === "string" ? CallbackString(page, pages, queue) : CallbackEmbed(page, pages, embed, queue, EnableQueue);
                message.channel.send(typeof embed === "string" ? embed : { embeds: [embed] }).then((msg) => {
                    Object.entries(Callbacks).forEach(([key, value]) => reaction(message.author, message, msg, value, key));
                });
            });
        };
    }
}
exports.CollectorSortReaction = CollectorSortReaction;
function DeleteMessage(msg) {
    msg.deletable ? msg.delete().catch(() => null) : null;
}
function reaction(user, message, msg, callback, emoji) {
    return msg.react(emoji).then(() => msg.createReactionCollector({ filter: (reaction, user) => filter(emoji, reaction, user, message), time: 1e4 * 25 })
        .on('collect', (reaction) => callback(reaction, user, message, msg))).catch(() => undefined);
}
function filter(emoji, reaction, user, message) {
    return (reaction.emoji.name === emoji && user.id !== message.client.user.id);
}
function CallbackString(page, pages, queue) {
    return {
        back: ({ users }, user, message, msg) => {
            setImmediate(() => {
                users.remove(user);
                if (page === 1)
                    return null;
                page--;
                return msg.edit(`\`\`\`css\n➡️ | Current playing -> [${queue.songs[0].title}]\n\n${pages[page - 1]}\n\n${message.author.username} | ${(0, DurationUtils_1.TimeInArray)(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}\`\`\``);
            });
        },
        cancel: (reaction, user, message, msg) => {
            setImmediate(() => {
                [msg, message].forEach((mes) => DeleteMessage(mes));
            });
        },
        up: ({ users }, user, message, msg) => {
            setImmediate(() => {
                users.remove(user);
                if (page === pages.length)
                    return null;
                page++;
                return msg.edit(`\`\`\`css\n➡️ | Current playing -> [${queue.songs[0].title}]\n\n${pages[page - 1]}\n\n${message.author.username} | ${(0, DurationUtils_1.TimeInArray)(queue)} | Лист ${page} из ${pages.length} | Songs: ${queue.songs.length}\`\`\``);
            });
        }
    };
}
function CallbackEmbed(page, pages, embed, queue, EnableQueue) {
    return {
        back: ({ users }, user, message, msg) => {
            setImmediate(() => {
                users.remove(user);
                if (page === 1)
                    return null;
                page--;
                embed = { ...embed, description: pages[page - 1] };
                if (EnableQueue)
                    embed = { ...embed,
                        footer: {
                            text: `${message.author.username} | ${(0, DurationUtils_1.TimeInArray)(queue)} | Лист ${page} из ${pages.length}`,
                            iconURL: message.author.displayAvatarURL()
                        }
                    };
                else
                    embed = { ...embed,
                        footer: {
                            text: `${message.author.username} | Лист ${page} из ${pages.length}`,
                            iconURL: message.author.displayAvatarURL()
                        }
                    };
                return msg.edit({ embeds: [embed] });
            });
        },
        cancel: (reaction, user, message, msg) => {
            setImmediate(() => {
                [msg, message].forEach((mes) => DeleteMessage(mes));
            });
        },
        up: ({ users }, user, message, msg) => {
            setImmediate(() => {
                users.remove(user);
                if (page === pages.length)
                    return null;
                page++;
                embed = { ...embed, description: pages[page - 1] };
                if (EnableQueue)
                    embed = { ...embed,
                        footer: {
                            text: `${message.author.username} | ${(0, DurationUtils_1.TimeInArray)(queue)} | Лист ${page} из ${pages.length}`,
                            iconURL: message.author.displayAvatarURL()
                        }
                    };
                else
                    embed = { ...embed,
                        footer: {
                            text: `${message.author.username} | Лист ${page} из ${pages.length}`,
                            iconURL: message.author.displayAvatarURL()
                        }
                    };
                return msg.edit({ embeds: [embed] });
            });
        }
    };
}
