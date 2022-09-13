import {Command} from "../../../Structures/Command";
import {httpsClient} from "../../../Core/httpsClient";
import {EmbedConstructor} from "../../Events/Activity/Message";
import {GlobalUtils} from "../../../Core/Utils/LiteUtils";
import {Colors, MessageReaction, User} from "discord.js";
import {CollectorSortReaction} from "../../../Core/Utils/ReactionMenu";
import {ClientMessage} from "../../Events/Activity/Message";

const TraderApi = "https://api.warframestat.us/pc/ru/voidTrader/";
const VoidIcon = "https://cdn.discordapp.com/attachments/850775689107865641/996413936595378256/BaroBanner.webp";
export default class Trader extends Command {
    public constructor() {
        super({
            name: "baro",
            description: "Когда прейдет баро или когда он уйдет, так-же что он щас продает!",
            aliases: ["торговец", "trader", "voidtrader", "void", "KiTeer"],

            slash: true,
            enable: true
        });
    }
    public readonly run = (message: ClientMessage) => {
        httpsClient.parseJson(TraderApi).then((res: voidTrader) => {
            const pagesInventory = this.#parsedInventory(res.inventory);

            return this.#SendMessage(message, res, pagesInventory)
        });
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем сообщение
     * @param message {ClientMessage} Само сообщение
     * @param res {voidTrader} Данные о торговце
     * @param pagesInventory {string[]} Измененный инвентарь
     * @private
     */
    readonly #SendMessage = (message: ClientMessage, res: voidTrader, pagesInventory: string[]) => {
        const EmbedVoidTrader: EmbedConstructor = {
            color: Colors.DarkBlue,
            thumbnail: {url: VoidIcon},
            author: {
                name: res.character,
                url: "https://warframe.fandom.com/wiki/Baro_Ki%27Teer"
            },
            footer: {
                text: `${res.active ? `Уйдет через` : `Прейдет через`} ${!res.active ? res.startString : res.endString}`,
            }
        };
        //Если есть инвентарь, то запускаем CollectorSortReaction
        if (pagesInventory.length >= 1) {
            EmbedVoidTrader.description = pagesInventory[0];
            new CollectorSortReaction(EmbedVoidTrader, message, this.#Callbacks(1, pagesInventory, EmbedVoidTrader));
            return;
        }
        //Если инвентаря нет просто отправляем сообщение
        message.channel.send({embeds: [EmbedVoidTrader]}).then((msg) => GlobalUtils.DeleteMessage(msg, 25e3));
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Парсим инвентарь Baro Ki'teera
     * @param inventory {Array<voidTraderItem>} Исходный инвентарь
     * @private
     */
    readonly #parsedInventory = (inventory: voidTraderItem[]) => {
        let pages: string[] = [], itemNumber = 1;

        //Если есть инвентарь, то парсим все в string
        if (inventory.length !== 0) {
            // @ts-ignore
            inventory.ArraySort(5).forEach((items: voidTraderItem[]) => {
                const item = items.map((item) =>
                    `${itemNumber++} Предмет [**${item.item}**]  
                    **❯ Кредиты:** (${FormatBytes(item.credits)})
                    **❯ Дукаты :** ${item.ducats ? `(${item.ducats})` : `(Нет)`}`
                ).join("\n\n");

                //Если item не undefined, то добавляем его в pages
                if (item !== undefined) pages.push(item);
            });
        }

        return pages;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Функции для управления <CollectorSortReaction>
     * @param page {number} С какой страницы начнем
     * @param pages {Array<string>} страницы
     * @param embed {EmbedConstructor} Json<Embed>
     * @private
     */
    readonly #Callbacks = (page: number, pages: string[], embed: EmbedConstructor) => {
        return {
            //При нажатии на 1 эмодзи, будет выполнена эта функция
            back: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage) => {
                setImmediate(() => {
                    users.remove(user).catch((err) => console.log(err));

                    if (page === 1) return null;
                    page--;
                    embed = {...embed, description: pages[page - 1]};
                    return msg.edit({embeds: [embed]});
                });
            },
            //При нажатии на 2 эмодзи, будет выполнена эта функция
            cancel: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage) => {
                setImmediate(() => {
                    [msg, message].forEach((mes) => mes.deletable ? mes.delete().catch(() => null) : null);
                });
            },
            //При нажатии на 3 эмодзи, будет выполнена эта функция
            next: ({users}: MessageReaction, user: User, message: ClientMessage, msg: ClientMessage) => {
                setImmediate(() => {
                    users.remove(user).catch((err) => console.log(err));

                    if (page === pages.length) return null;
                    page++;

                    embed = {...embed, description: pages[page - 1]};
                    return msg.edit({embeds: [embed]});
                });
            }
        };
    };
}

function FormatBytes(heapUsed: number): string {
    if (heapUsed === 0) return '0';
    const sizes: string[] = ['k', 'kk', 'kkk'];
    const i: number = Math.floor(Math.log(heapUsed) / Math.log(1000));
    return `${parseFloat((heapUsed / Math.pow(1000, i)).toFixed(2))} ${sizes[i]}`;
}

interface voidTraderItem {
    item: string;
    ducats: number;
    credits: number;
}
interface voidTrader {
    id: string,
    activation: Date,
    startString: string,
    expiry: Date,
    active: boolean,
    character: string,
    location: string,
    inventory: voidTraderItem[] | null,
    psId: string,
    endString: string,
    initialStart: Date,
    schedule: Array<undefined>
}