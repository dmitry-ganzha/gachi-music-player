import {ApplicationCommandOptionType, PermissionResolvable} from "discord.js";
import {ClientInteractive} from "../Handler/Events/Activity/interactiveCreate";

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

interface InteractiveOptions {
    name: string,
    description: string,
    required?: boolean,
    type: ApplicationCommandOptionType | string
}