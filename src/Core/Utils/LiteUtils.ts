import {Guild, ActionRowBuilder, ButtonBuilder, ButtonStyle, VoiceState} from "discord.js";
import cfg from "../../../DataBase/Config.json";
import {getVoiceConnection} from "@discordjs/voice";
import {ColorResolvable, EmbedConstructor} from "./TypeHelper";
import {ClientMessage} from "../Client";

const Colors = {
    YELLOW: 0xfee75c,
    RED: 0xed4245,
    GREEN: 1420288,
    BLUE: 258300,
    WHITE: 0xffffff,
    BLACK: 0x000000,
    RANDOM: 0,
    GREY: 0x95a5a6,
    NAVY: 0x34495e,
    GOLD: 0xf1c40f,
    ORANGE: 0xe67e22,
    PURPLE: 0x9b59b6,
};

export {Colors};

/**
 * @description Map base
 */
export class CollectionMap<K, V> extends Map<K, V> {
    public get Array(): V[] | null {
        const db: V[] = [];
        for (let [, value] of this.entries()) db.push(value);

        return db;
    };

    public swap = (set: number = 0, next: number, path: string, K: K) => {
        // @ts-ignore
        const Array: any = this.get(K)[path];
        const hasChange = Array[next];

        Array[next] = Array[set];
        Array[set] = hasChange;
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Отправляет лог со временем
 * @param text {string}
 * @constructor
 */
export function ConsoleLog(text: string) {
    return setTimeout(() => console.log(`[${(new Date).toLocaleString("ru")}] ${text}`), 25);
}
//====================== ====================== ====================== ======================
/**
 * @description Обрезает текс до необходимых значений
 * @param text {string} Сам текст
 * @param value {number} До сколько символов обрезаем
 * @param clearText {boolean} Чистить текст от []
 * @constructor
 */
export function ConvertedText(text: string, value: number | any, clearText: boolean = false) {
    try {
        if (clearText) text = text.replace("[", "").replace("]", "").replace(/`/, "");
        if (text.length > value && value !== false) return `${text.substring(0, value)}...`;
        return text;
    } catch { return text; }
}
//====================== ====================== ====================== ======================
/**
 * @description Заранее заготовленные кнопки
 * @param ClientID {string} ID бота
 */
export function getButtons(ClientID: string) {
    const Buttons = {
        MyUrl: new ButtonBuilder().setURL(`https://discord.com/oauth2/authorize?client_id=${ClientID}&permissions=8&scope=bot+applications.commands`).setEmoji({name: "🔗"}).setLabel("Invite").setStyle(ButtonStyle.Link),
        ServerUrl: new ButtonBuilder().setURL(cfg.Bot.DiscordServer).setEmoji({name: "🛡"}).setLabel("Help server").setStyle(ButtonStyle.Link),
        Git: new ButtonBuilder().setURL("https://github.com/SNIPPIK/WatKLOK-BOT").setEmoji({name: "🗂"}).setLabel("GitHub").setStyle(ButtonStyle.Link)
    };
    return new ActionRowBuilder().addComponents([Buttons.MyUrl, Buttons.ServerUrl, Buttons.Git]);
}
//====================== ====================== ====================== ======================
/**
 * @description Все пользователи из гс в котором сидит бот если он там сидит
 * @param Guild {Guild} Сервер с которого надо получить список пользователей
 * @constructor
 */
export function Connections(Guild: Guild): VoiceState[] {
    const Users: VoiceState[] = [], set = getVoiceConnection(Guild.id);
    if (set) {
        Guild.voiceStates.cache.forEach((fn: VoiceState): any => {
            if (!(fn.channelId === set.joinConfig.channelId && fn.guild.id === set.joinConfig.guildId)) return;
            Users.push(fn);
        });
    }

    return Users;
}

//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//File: MessageSend
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
export type SendOptions = {
    text: string;
    color?: ColorResolvable | number;
    message: ClientMessage;
    type?: OptionsSendType;
}
type OptionsSendType =  "css" | "js" | "ts" | "cpp" | "html" | "cs";


export function MessageChannelSend(options: SendOptions): void {
    if (typeof options.type === "string") return SendMessageCode(options);
    return SendMessageNoCode(options)
}

function SendMessageCode(options: SendOptions): void {
    return CatchMessage(options.message.channel.send({
        embeds: [MessageEmbed(options.color, `\`\`\`${options.type}\n${options.text}\n\`\`\``)],
    }));
}
function SendMessageNoCode(options: SendOptions): void {
    return CatchMessage(options.message.channel.send({
        embeds: [MessageEmbed(options.color, options.text)]
    }));
}

function CatchMessage(type: Promise<ClientMessage>): void {
    type.then((msg: ClientMessage) => setTimeout(() => msg.deletable ? msg.delete() : null, 12e3))
        .catch((err: Error) => console.log(`[Discord Error]: [Send message] ${err}`));

    return;
}

function MessageEmbed(color: ColorResolvable | number = "BLUE", description: string): EmbedConstructor {
    return {
        color: typeof color === "number" ? color : ConvertColor(color), description
    }
}

function ConvertColor(color: ColorResolvable): number | null {
    let colorOut;
    try {
        // @ts-ignore
        colorOut = Colors[color];
    } catch {
        return Colors.BLUE;
    }

    return colorOut;
}