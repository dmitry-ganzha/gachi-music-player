import {W_Message} from "../Core/Utils/W_Message";
import {PermissionResolvable} from "discord.js";

export class Command {
    public readonly name: string;
    public readonly aliases: string[];
    public readonly description: string;
    public readonly permissions: {client: PermissionResolvable[], user: PermissionResolvable[]};
    public readonly isOwner: boolean;
    public readonly slash: boolean;
    public readonly enable: boolean;
    public type: string;
    // @ts-ignore
    public run (message: W_Message, args?: string[]): Promise<void | unknown>;

    constructor({
        name = null,
        aliases = [],
        description = "Нету описания",
        permissions = {
            client: [],
            user: []
        },
        isOwner = false,
        enable = false,
        slash = false,
        type = "", //Дериктория файла (авто определение)
    }) {
        this.name = name;
        this.aliases = aliases;
        this.description = description;
        this.permissions = permissions;
        this.isOwner = isOwner;
        this.slash = slash;
        this.enable = enable;
        this.type = type
    }
    public DeleteMessage = (message: W_Message, time: number = 2e3): NodeJS.Timeout => setTimeout(() => message.delete().catch(() => null), time);
}