import {ApplicationCommandOptionType, Colors, MessageReaction, PermissionResolvable, User} from "discord.js";
import {
    ClientInteraction,
    ClientInteractive,
    ClientMessage,
    EmbedConstructor
} from "../../Handler/Events/Activity/interactiveCreate";

interface InteractiveOptions {
    name: string,
    description: string,
    required?: boolean,
    type: ApplicationCommandOptionType | string
}
export class Command {
    public constructor(options: {
        name: string;
        aliases?: string[];
        description?: string;
        //
        usage?: string;
        permissions?: { client: PermissionResolvable[], user: PermissionResolvable[] };
        options?: InteractiveOptions[];
        //
        isOwner?: boolean;
        isSlash?: boolean;
        isGuild?: boolean;
        isEnable?: boolean;
        //
        isCLD?: number;
    }) {
        Object.keys(options).forEach((key) => {
            // @ts-ignore
            if (options[key] !== null) this[key] = options[key];
        });
    };
    public readonly run: (message: ClientInteractive, args?: string[]) => any;

    public readonly name: string = null;
    public readonly aliases: string[] = [];
    public readonly description: string = "Нет описания";

    public readonly usage: string = null;
    public readonly permissions: { client: PermissionResolvable[], user: PermissionResolvable[] } = {client: null, user: null};
    public readonly options: InteractiveOptions[] = null;

    public readonly isOwner: boolean  = false;
    public readonly isSlash: boolean  = true;
    public readonly isGuild: boolean  = true;
    public readonly isEnable: boolean = false;

    public readonly isCLD: number = 5;
    public readonly type: string;
}


type SendOptions = {
    text: string | EmbedConstructor;
    color?: "DarkRed" | "Blue" | "Green" | "Default" | "Yellow" | "Grey" | "Navy" | "Gold" | "Orange" | "Purple" | number;
    message: ClientMessage | ClientInteraction;
    type?: "css" | "js" | "ts" | "cpp" | "html" | "cs" | "json";
}

/**
 * @description Взаимодействия с сообщениями
 */
export namespace messageUtils {
    //Удаляем сообщение
    export function deleteMessage(message: ClientMessage, time: number = 15e3): void {
        setTimeout(() => message.deletable ? message.delete().catch(() => null) : null, time);
    }
    //Создаем сборщик сообщений
    export function createCollector(message: ClientMessage, filter: (m: ClientMessage) => boolean, max: number = 1, time: number = 20e3) {
        // @ts-ignore
        return message.channel.createMessageCollector({filter, max, time});
    }
    //Добавляем реакцию к сообщению + взаимодействие
    export function createReaction(message: ClientMessage, emoji: string, filter: (reaction: MessageReaction, user: User) => boolean, callback: (reaction: MessageReaction) => any, time = 35e3): void {
        setTimeout(() => message?.deletable ? message?.delete().catch(() => undefined) : null, time);

        message.react(emoji).then(() => message.createReactionCollector({filter, time})
            .on("collect", (reaction: MessageReaction) => callback(reaction))).catch(() => undefined);
    }
    export function sendMessage({color, text, type, message}: SendOptions) {
        let Embed: EmbedConstructor;

        if (typeof text === "string") Embed = { color: typeof color === "number" ? color : Colors[color] ?? Colors.Blue, description: typeof type === "string" ? `\`\`\`${type}\n${text}\n\`\`\`` : text };
        else Embed = text;

        //Отправляем сообщение с упоминанием
        if ("isChatInputCommand" in message) {
            message.reply({embeds: [Embed as any]}).catch((): null => null);
            setTimeout(() => message.deleteReply().catch((): null => null), 15e3);
        } else { //Отправляем обычное сообщение
            const sendMessage = message.channel.send({embeds: [Embed as any]}) as Promise<ClientMessage>;
            sendMessage.then(messageUtils.deleteMessage);
            sendMessage.catch((err: Error) => console.log(`[Discord Error]: [Send message] ${err}`));
        }
    }
}

/**
 * @description Изменение данных
 */
export namespace replacer {
    export function replaceArray(text: string, srt: string[]) {
        srt.forEach((str) => text.replace(str, ""));

        return text;
    }
    //Обрезает текст до необходимых значений
    export function replaceText(text: string, value: number | any, clearText: boolean = false) {
        try {
            if (clearText) text = text.replace(/[\[,\]}{"`']/gi, "");
            if (text.length > value && value !== false) return `${text.substring(0, value)}...`;
            return text;
        } catch { return text; }
    }
}