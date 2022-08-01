import {Guild, ActionRowBuilder, ButtonBuilder, ButtonStyle, VoiceState} from "discord.js";
import cfg, {Bot} from "../../../DataBase/Config.json";
import {getVoiceConnection} from "@discordjs/voice";
import {ColorResolvable, EmbedConstructor} from "./TypeHelper";
import {ClientMessage} from "../Client";
import {Command} from "../../Commands/Constructor";

const Colors = {
    YELLOW: 0xfee75c,
    RED: 0xed4245,
    GREEN: 1420288,
    BLUE: 258300,
    BLUE_DARK: 30719,
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
export const CoolDownBase = new Map();

export namespace LiteUtils {
    /**
     * @description Map base
     */
    export class CollectionMap<K, V> extends Map<K, V> {
        public get Array(): V[] | null {
            const db: V[] = [];
            for (let [, value] of this.entries()) db.push(value);

            return db;
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
    export function replaceText(text: string, value: number | any, clearText: boolean = false) {
        try {
            if (clearText) text = text.replace(/[\[,\]}{"`']/gi, "");
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
            Git: new ButtonBuilder().setURL("https://github.com/SNIPPIK/WatKLOK").setEmoji({name: "🗂"}).setLabel("GitHub").setStyle(ButtonStyle.Link)
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
}
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//File: MessageSend
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
type SendOptions = {
    text: string;
    color?: ColorResolvable | number;
    message: ClientMessage;
    type?: "css" | "js" | "ts" | "cpp" | "html" | "cs";
}

export namespace MessageSend {
    /**
     * @description Отправляем просто embed сообщение
     * @param options {SendOptions} Параметры отправки
     * @constructor
     */
    export function Send({color, text, type, message}: SendOptions): void {
        const Embed: EmbedConstructor = {
            color: typeof color === "number" ? color : ConvertColor(color),
            description: typeof type === "string" ? `\`\`\`${type}\n${text}\n\`\`\`` : text
        };

        const sendMessage = message.channel.send({ embeds: [Embed] });
        sendMessage.then((msg: ClientMessage) => setTimeout(() => msg.deletable ? msg.delete().catch(() => null) : null, 12e3));
        sendMessage.catch((err: Error) => console.log(`[Discord Error]: [Send message] ${err}`));
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Из строки делаем номер
 * @param color {ColorResolvable} Все доступные цвета
 * @constructor
 */
function ConvertColor(color: ColorResolvable): number | null {
    // @ts-ignore
    const Color = Colors[color];

    if (Color) return Color;
    return Colors.BLUE;
}

//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
type CommandPermission = Command['permissions'];
type CommandIsOwner = Command['isOwner'];

export namespace UtilsPermissions {
    // Пользователь owner?
    export function isOwner(isOwner: CommandIsOwner, AuthorID: string) {
        if (isOwner) return !Bot.OwnerIDs.includes(AuthorID);
        return false;
    }
    // У пользователя есть ограничения?
    export function isPermissions(permissions: CommandPermission, message: ClientMessage): boolean {
        if (permissions.client.length > 0 || permissions.user.length > 0) {
            const {client, user} = _parsePermissions(permissions, message);
            const Embed = EmbedNotPermissions(message);

            //Добавляем fields если есть ограничения для бота
            if (client) Embed.fields.push({name: "У меня нет этих прав!", value: client});

            //Добавляем fields если есть ограничения для пользователя
            if (user) Embed.fields.push({name: "У тебя нет этих прав!", value: user});

            //Отправляем сообщение
            if (user || client) return SendMessage(Embed, message.channel);
        }

        return false;
    }
}
function _parsePermissions(permissions: CommandPermission, message: ClientMessage): {user: string, client: string } {
    let ClientString = "", UserString = "";

    //Если permissions.client больше 0, то делаем проверку
    if (permissions.client.length > 0) {
        for (let i in permissions.client) {
            if (!message.guild.members.me?.permissions?.has(permissions.client[i])) ClientString += `•${permissions.client[i]}\n`;
        }
    }
    //Если permissions.user больше 0, то делаем проверку
    if (permissions.user.length > 0) {
        for (let i in permissions.user) {
            if (!message.member.permissions.has(permissions.user[i])) UserString += `•${permissions.user[i]}\n`;
        }
    }

    return {
        user: UserString,
        client: ClientString
    }
}
// Отправляем сообщение о том каких прав нет у пользователя или бота
function SendMessage(embed: EmbedConstructor, channel: ClientMessage["channel"]): true {
    channel.send({embeds: [embed as any]}).then(DeleteMessage).catch(() => null);

    return true;
}


//Message сообщение
function EmbedNotPermissions({author, client}: ClientMessage): EmbedConstructor {
    return {
        color: Colors.BLUE,
        author: { name: author.username, iconURL: author.displayAvatarURL({}) },
        thumbnail: { url: client.user.displayAvatarURL({}) },
        timestamp: new Date() as any
    }
}
function DeleteMessage(message: ClientMessage, time: number = 12e3): void {
    setTimeout(() => message.deletable ? message.delete().catch(() => null) : null, time);
}