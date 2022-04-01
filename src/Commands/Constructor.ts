import {ApplicationCommandOptionType, PermissionResolvable} from "discord.js";
import {ClientMessage} from "../Core/Client";

export class Command {
    public readonly name: string;
    public readonly aliases: string[];
    public readonly description: string;
    public readonly permissions: {client: PermissionResolvable[], user: PermissionResolvable[]};
    public readonly options: InteractiveOptions[]
    public readonly isOwner: boolean;
    public readonly slash: boolean;
    public readonly enable: boolean;
    public readonly CoolDown: number
    public type: string;
    // @ts-ignore
    public run (message: ClientMessage, args?: string[]): Promise<void | any> | void | any;

    public constructor(
        {
            name = "" as string,
            aliases = [] as string[],
            description = "Нету описания" as string,
            permissions = {
                client: [] as PermissionResolvable[],
                user: [] as PermissionResolvable[]
            },
            options = [] as InteractiveOptions[],
            isOwner = false as boolean,
            enable = false as boolean,
            slash = false as boolean,
            CoolDown = 5,
            type = "" as string, //Дериктория файла (авто определение)
        }
    ) {
        this.name = name;
        this.aliases = aliases;
        this.description = description;
        this.permissions = permissions;
        this.options = options;
        this.isOwner = isOwner;
        this.slash = slash;
        this.enable = enable;
        this.CoolDown = CoolDown;
        this.type = type;
    };
    protected static DeleteMessage = (message: ClientMessage, time: number = 2e3) => setTimeout(() => message.delete().catch((): null => null), time);
}

interface InteractiveOptions {
    name: string,
    description: string,
    required?: boolean,
    type: ApplicationCommandOptionType | string
}