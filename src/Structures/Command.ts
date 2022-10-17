import {ApplicationCommandOptionType, PermissionResolvable} from "discord.js";
import {ClientMessage} from "../Handler/Events/Activity/Message";
import {ClientInteraction} from "../Handler/Events/Activity/SlashCommand";

export class Command {
    //Название команды
    public readonly name: string;

    //Доп названия команды
    public readonly aliases: string[];

    //Описание команды
    public readonly description: string;
    //Права пользователя и бота (необходимые права для использования команды)
    public readonly permissions: { client: PermissionResolvable[], user: PermissionResolvable[] };

    //Неообходимо для Discord (SlashCommand), если аргументы не нужны то оставить пустой
    public readonly options: InteractiveOptions[]

    //Данная команда доступна только разработчикам
    public readonly isOwner: boolean;

    //Загружать ли команду в Discord (SlashCommand)
    public readonly slash: boolean;

    //Загружать ли вообще эту команду
    public readonly enable: boolean;

    //Через сколько пользователь сможет включить команду
    public readonly CoolDown: number;

    //Дериктория из которой загрузили команду
    public type: string;

    //Функция, которая будет запущена при вызове команды
    public readonly run: (message: ClientMessage | ClientInteraction, args?: string[]) => any;

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
}

interface InteractiveOptions {
    name: string,
    description: string,
    required?: boolean,
    type: ApplicationCommandOptionType | string
}

export interface TypeSlashCommand {
    name: string,
    description: string,
    options?: InteractiveOptions[],
    type?: any
}