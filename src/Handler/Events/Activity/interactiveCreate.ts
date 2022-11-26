import {ActionRow,ActionRowBuilder,BaseInteraction,BaseMessageOptions,ChannelType,CommandInteractionOption,DMChannel,EmbedData,GuildMember,Message,MessageEditOptions,MessagePayload,NewsChannel,PartialDMChannel,TextChannel,ThreadChannel,User} from "discord.js";
import {Bot} from '../../../../db/Config.json';
import {WatKLOK} from "../../../Core/Client/Client";
import {DurationUtils} from "../../../AudioPlayer/Managers/DurationUtils";
import {Event} from "../../../Structures/Handle/Event";
import ParsingTimeToString = DurationUtils.ParsingTimeToString;
import {messageUtils} from "../../../Structures/Handle/Command";

const DefaultPrefix = Bot.prefix; //Префикс
const CoolDownBase = new Map<string, { time: number }>();

export class interactiveCreate extends Event<ClientInteractive, null> {
    public readonly name = ["messageCreate", "interactionCreate"];
    public readonly isEnable = true;

    public readonly run = (message: ClientInteractive) => {
        //Игнорируем ботов
        if (message.author?.bot || message.user?.bot) return;

        //Если в сообщении нет префикса или interaction type не команда, то игнорируем
        if ("content" in message && !message.content?.startsWith(DefaultPrefix) || "isChatInputCommand" in message && !message.isChatInputCommand()) return;

        const isInteraction = !("content" in message);
        const commandName = isInteraction ? message.commandName : message.content?.split(" ")[0]?.slice(DefaultPrefix.length)?.toLowerCase();
        const command = message.client.commands.get(commandName) ?? message.client.commands.Array.find(cmd => cmd.aliases.includes(commandName));
        const args: string[] = isInteraction ? message.options?._hoistedOptions?.map((f: CommandInteractionOption) => `${f.value}`) : message.content.split(" ").slice(1);

        //Удаляем сообщение через 12 сек
        if (!isInteraction) setTimeout(() => message.deletable ? message.delete().catch(() => null) : null, 12e3);
        else { //Делаем ClientInteraction похожим на ClientMessage
            message.author = message.member.user ?? message.user;
            message.delete = (): Promise<void> => (message as ClientInteraction).deleteReply().catch((): null => null);
        }
        const {author} = message;

        //Если нет команды, которую требует пользователь сообщаем ему об этом
        if (!command) return messageUtils.sendMessage({text: `${author}, Я не нахожу такой команды, используй ${DefaultPrefix}help  :confused:`,
            message, color: "DarkRed"
        });

        //Если пользователь не входит в состав разработчиков
        if (!Bot.OwnerIDs.includes(author.id)) {
            //Если команда для разработчиков
            if (command.isOwner) return messageUtils.sendMessage({
                text: `${author}, Эта команда не для тебя!`, message, color: "DarkRed"
            });

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

        //Если команду нельзя использовать все сервера
        if (command.isGuild && !message.guild) return messageUtils.sendMessage({text: `${author}, эта команда не работает вне сервера!`,
            message, color: "DarkRed"
        });

        const permissions = command.permissions;

        //Проверяем нет ли у бота ограничений на права
        if (permissions.client?.length > 0) {
            const ClientString: string[] = [];

            for (let i in permissions.client) {
                if (!message.guild.members.me?.permissions?.has(permissions.client[i])) ClientString.push(permissions.client[i] as string);
            }

            if (ClientString.length > 0) return messageUtils.sendMessage({text: `Внимание ${author.tag}\nУ меня нет прав на: ${ClientString.join(", ")}`,
                message, color: "DarkRed", type: "css"
            });
        }

        //Проверяем нет ли у пользователя ограничений на права
        if (permissions.user?.length > 0) {
            const UserString: string[] = [];

            for (let i in permissions.user) {
                if (!message.member.permissions.has(permissions.user[i])) UserString.push(permissions.user[i] as string);
            }

            if (UserString.length > 0) return messageUtils.sendMessage({text: `Внимание ${author.tag}\nУ тебя нет прав на: ${UserString.join(", ")}`,
                message, color: "DarkRed", type: "css"
            });
        }

        //Передаем данные в команду
        return command.run(message, args ?? []);
    };
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