import {ActionRow,ActionRowBuilder,BaseInteraction,BaseMessageOptions,ChannelType,Colors,CommandInteractionOption,DMChannel,EmbedData,GuildMember,Message,MessageEditOptions,MessagePayload,NewsChannel,PartialDMChannel,TextChannel,ThreadChannel,User} from "discord.js";
import {Bot} from '../../../../db/Config.json';
import {WatKLOK} from "../../../Core/Client/Client";
import {DurationUtils} from "../../../AudioPlayer/Managers/DurationUtils";
import {Event} from "../../../Structures/Handle/Event";
import ParsingTimeToString = DurationUtils.ParsingTimeToString;
import {Command, messageUtils} from "../../../Structures/Handle/Command";

const DefaultPrefix = Bot.prefix; //Префикс
const CoolDownBase = new Map<string, { time: number }>();

export class interactiveCreate extends Event<ClientInteractive, null> {
    public readonly name = ["messageCreate", "interactionCreate"];
    public readonly isEnable = true;

    public readonly run = (message: ClientInteractive) => {
        if (message.author?.bot || message.user?.bot) return; //Игнорим ботов

        //Если message не является командой или начинает не с префикса, то игнор
        if ("isChatInputCommand" in message && !message.isChatInputCommand() || "content" in message && !message.content?.startsWith(DefaultPrefix)) return;

        const isSlash = !("content" in message);
        //Удаляем сообщение через 12 сек
        if (!isSlash) setTimeout(() => message.deletable ? message.delete().catch(() => null) : null, 12e3);
        //Делаем ClientInteraction похожим на ClientMessage
        if (isSlash) {
            message.author = message.member.user ?? message.user;
            message.delete = (): Promise<void> => (message as ClientInteraction).deleteReply().catch((): null => null);
        }

        const {author, client} = message;
        const commandName = isSlash ? message.commandName : this.#parsingMessageContent(message.content);

        const command = message.client.commands.get(commandName) ?? client.commands.Array.find(cmd => cmd.aliases.includes(commandName));
        const args: string[] = isSlash ? message.options?._hoistedOptions?.map((f: CommandInteractionOption) => `${f.value}`) : message.content.split(" ").slice(1);

        //Если пользователь является одним из разработчиков, не добавляем его в CoolDown!
        if (UtilsPermissions.isOwner(true, author.id)) {
            //Проверяем находится ли пользователь в базе
            if (CoolDownBase.get(author.id)) return messageUtils.sendMessage({
                text: `${author}, я тебе что квантовый компьютер. Подожди ${ParsingTimeToString(CoolDownBase.get(author.id).time)}`,
                message
            });
            else {
                //Добавляем пользователя в CoolDown базу
                CoolDownBase.set(author.id, {time: command.isCLD});
                setTimeout(() => CoolDownBase.delete(author.id), command.isCLD * 1e3 ?? 5e3);
            }
        }

        if (!command) return messageUtils.sendMessage({
            text: `${author}, Я не нахожу такой команды, используй ${DefaultPrefix}help  :confused:`, message, color: "DarkRed"
        });

        //Если команда предназначена для разработчика
        if (UtilsPermissions.isOwner(command.isOwner, author.id)) return messageUtils.sendMessage({
            text: `${author}, Эта команда не для тебя!`, message, color: "DarkRed"
        });

        //Если нет прав у пользователя или бота
        if (UtilsPermissions.isPermissions(command.permissions, message)) return;

        //Если команду нельзя использовать все сервера
        if (command.isGuild && !message.guild) return messageUtils.sendMessage({text: `${author}, эта команда не работает вне сервера!`, message, color: "DarkRed"});

        return command.run(message, args ?? []);
    };
    //Получаем command<name>
    readonly #parsingMessageContent = (content: string) => content.split(" ")[0]?.slice(DefaultPrefix.length)?.toLowerCase();
}

//Проверка прав (проверят права указанные в команде)
export namespace UtilsPermissions {
    //Пользователь owner?
    export function isOwner(isOwner: boolean, AuthorID: string) {
        return isOwner && !Bot.OwnerIDs.includes(AuthorID);
    }
    //У пользователя есть ограничения?
    export function isPermissions(permissions: Command['permissions'], message: ClientInteractive): boolean {
        if (permissions.client?.length > 0 || permissions.user?.length > 0) {
            const {client, user} = _parsePermissions(permissions, message);
            const Embed: EmbedConstructor = {
                color: Colors.Blue,
                author: {name: message.author.username, iconURL: message.author.displayAvatarURL({})},
                thumbnail: {url: message.client.user.displayAvatarURL({})},
                timestamp: new Date() as any
            };

            //Добавляем fields если есть ограничения для бота
            if (client) Embed.fields.push({name: "У меня нет этих прав!", value: client});

            //Добавляем fields если есть ограничения для пользователя
            if (user) Embed.fields.push({name: "У тебя нет этих прав!", value: user});

            //Отправляем сообщение
            if (user || client) {
                messageUtils.sendMessage({text: Embed, message});

                return true;
            }
        }

        return false;
    }
    //Создает строку с правами которые не доступны
    function _parsePermissions(permissions: Command['permissions'], message: ClientInteractive): { user: string, client: string } {
        let ClientString = "", UserString = "";

        //Если permissions.client больше 0, то делаем проверку
        if (permissions.client?.length > 0) {
            for (let i in permissions.client) {
                if (!message.guild.members.me?.permissions?.has(permissions.client[i])) ClientString += `•${permissions.client[i]}\n`;
            }
        }
        //Если permissions.user больше 0, то делаем проверку
        if (permissions.user?.length > 0) {
            for (let i in permissions.user) {
                if (!message.member.permissions.has(permissions.user[i])) UserString += `•${permissions.user[i]}\n`;
            }
        }

        return {user: UserString, client: ClientString};
    }
}


export type ClientInteractive = ClientMessage | ClientInteraction;
type SendMessageOptions = string | MessagePayload | BaseMessageOptions | { embeds?: EmbedConstructor[], components?: ActionRow<any> | ActionRowBuilder<any> };
// @ts-ignore
export interface ClientMessage extends Message {
    client: WatKLOK;
    channel: { send(options: SendMessageOptions): Promise<ClientMessage> } & Channel;
    edit(content: SendMessageOptions | MessageEditOptions): Promise<ClientMessage>
    reply(options: SendMessageOptions): Promise<ClientMessage>
    user: null;
}
export interface ClientInteraction extends BaseInteraction {
    client: WatKLOK;
    member: GuildMember; customId: string; commandName: string; commandId: string; author: User;
    delete: () => void; deferReply: () => Promise<void>; deleteReply: () => Promise<void>; options?: { _hoistedOptions: any[] };
    reply: ClientMessage["channel"]["send"] & {fetchReply?: boolean};
}

//Все текстовые каналы
export type Channel = DMChannel | PartialDMChannel | NewsChannel | TextChannel | ThreadChannel;
//Embed JSON
export interface EmbedConstructor extends EmbedData {}