"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Trader = void 0;
const Command_1 = require("@Structures/Handle/Command");
const ArraySort_1 = require("@Structures/ArraySort");
const discord_js_1 = require("discord.js");
const _httpsClient_1 = require("@httpsClient");
const TraderApi = "https://api.warframestat.us/pc/ru/voidTrader/";
const VoidIcon = "https://cdn.discordapp.com/attachments/850775689107865641/996413936595378256/BaroBanner.webp";
class Trader extends Command_1.Command {
    constructor() {
        super({
            name: "baro",
            description: "Когда прейдет баро или когда он уйдет, так-же что он щас продает!",
            aliases: ["trader", "voidtrader", "void", "kiteer"],
            isSlash: true,
            isEnable: true,
            isGuild: false
        });
    }
    run = async (_) => {
        const result = await _httpsClient_1.httpsClient.parseJson(TraderApi);
        const pagesInventory = (0, ArraySort_1.ArraySort)(5, result.inventory, (item, index = 1) => `┌Предмет [**${item.item}**]
             ├ **Номер  :** ${index++}
             ├ **Кредиты:** (${FormatBytes(item.credits)})
             └ **Дукаты :** ${item.ducats ? `(${item.ducats})` : `(Нет)`}`);
        return this.SendMessage(result, pagesInventory);
    };
    SendMessage = (res, pagesInventory) => {
        const EmbedVoidTrader = {
            color: discord_js_1.Colors.DarkBlue,
            thumbnail: { url: VoidIcon },
            author: {
                name: res.character,
                url: "https://warframe.fandom.com/wiki/Baro_Ki%27Teer"
            },
            footer: {
                text: `${res.active ? `Уйдет через` : `Будет через`} ${!res.active ? res.startString : res.endString}`,
            }
        };
        if (pagesInventory.length >= 1) {
            EmbedVoidTrader.description = pagesInventory[0];
            return { embed: EmbedVoidTrader, callbacks: this.Callbacks(1, pagesInventory, EmbedVoidTrader) };
        }
        return { embed: EmbedVoidTrader };
    };
    Callbacks = (page, pages, embed) => {
        return {
            back: ({ users }, user, message, msg) => {
                setImmediate(() => {
                    users.remove(user).catch((err) => console.log(err));
                    if (page === 1)
                        return null;
                    page--;
                    embed = { ...embed, description: pages[page - 1] };
                    return msg.edit({ embeds: [embed] });
                });
            },
            cancel: ({ users }, user, message, msg) => {
                setImmediate(() => {
                    [msg, message].forEach((mes) => mes.deletable ? mes.delete().catch(() => null) : null);
                });
            },
            next: ({ users }, user, message, msg) => {
                setImmediate(() => {
                    users.remove(user).catch((err) => console.log(err));
                    if (page === pages.length)
                        return null;
                    page++;
                    embed = { ...embed, description: pages[page - 1] };
                    return msg.edit({ embeds: [embed] });
                });
            }
        };
    };
}
exports.Trader = Trader;
function FormatBytes(num) {
    if (num === 0)
        return "0";
    const sizes = ["", "K", "KK", "KKK"];
    const i = Math.floor(Math.log(num) / Math.log(1000));
    return `${parseFloat((num / Math.pow(1000, i)).toFixed(2))} ${sizes[i]}`;
}
