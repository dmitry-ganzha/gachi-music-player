import { ApplicationCommandOptionType, PermissionResolvable } from "discord.js";
import {
    ClientInteraction,
    ClientInteractive,
    ClientMessage,
    EmbedConstructor
} from "../../Handler/Events/Activity/interactionCreate";

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
    public readonly run: (message: ClientInteractive, args?: string[]) => Promise<ResolveData>;

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

export type ResolveData = ResolveEmbed | ResolveText | ResolveMenu;

export interface messageUtilsOptions {
    text: string | EmbedConstructor;
    color?: ResolveText["color"];
    message: ClientMessage | ClientInteraction;
    codeBlock?: ResolveText["codeBlock"];
}
interface ResolveEmbed {
    embed: EmbedConstructor;
}
interface ResolveText {
    text: string;
    codeBlock?: "css" | "js" | "ts" | "cpp" | "html" | "cs" | "json",
    color?: "DarkRed" | "Blue" | "Green" | "Default" | "Yellow" | "Grey" | "Navy" | "Gold" | "Orange" | "Purple" | number;
    thenCallbacks?: Array<Function>;
}
interface ResolveMenu {
    embed: EmbedConstructor | string;
    callbacks: any;
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