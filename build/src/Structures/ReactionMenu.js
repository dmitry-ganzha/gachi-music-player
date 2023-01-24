"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReactionMenu = void 0;
const interactionCreate_1 = require("@Client/interactionCreate");
const Config_json_1 = require("@db/Config.json");
const emojis = Config_json_1.ReactionMenuSettings.emojis;
class ReactionMenu {
    constructor(embed, message, callbacks, isSlash = false) {
        const args = typeof embed === "string" ? { content: embed, fetchReply: true } : { embeds: [embed], fetchReply: true };
        setImmediate(() => {
            const promise = (msg) => Object.entries(callbacks).forEach(([key, value]) => {
                const emoji = emojis[key];
                const callback = (reaction) => value(reaction, message.author, message, msg);
                return interactionCreate_1.UtilsMsg.createReaction(msg, emoji, (reaction, user) => reaction.emoji.name === emoji && user.id !== message.client.user.id, callback, 60e3);
            });
            if (isSlash)
                message.reply(args).then(promise);
            else
                message.channel.send(args).then(promise);
        });
    }
    ;
    static Callbacks = (page, pages, embed) => {
        return {
            back: ({ users }, user, message, msg) => void setImmediate(() => {
                users.remove(user).catch((err) => console.log(err));
                if (page === 1 || !msg.editable)
                    return null;
                page--;
                embed = { ...embed, description: pages[page - 1], footer: { ...embed.footer, text: `${message.author.username} | Лист ${page} из ${pages.length}` } };
                return msg.edit({ embeds: [embed] });
            }),
            cancel: (reaction, user, message, msg) => void setImmediate(() => {
                [msg, message].forEach((mes) => mes.deletable ? mes.delete().catch(() => null) : null);
            }),
            next: ({ users }, user, message, msg) => void setImmediate(() => {
                users.remove(user).catch((err) => console.log(err));
                if (page === pages.length || !msg.editable)
                    return null;
                page++;
                embed = { ...embed, description: pages[page - 1], footer: { ...embed.footer, text: `${message.author.username} | Лист ${page} из ${pages.length}` } };
                return msg.edit({ embeds: [embed] });
            })
        };
    };
}
exports.ReactionMenu = ReactionMenu;
