import {Command} from "../../Commands/Constructor";
import {W_Message} from "../../Core/Utils/W_Message";
import {MessageEmbed, PermissionResolvable} from "discord.js";

export default class Message {
    public readonly name: string;
    public readonly enable: boolean;

    constructor() {
        this.name = "messageCreate";
        this.enable = true;
    };

    /**
     * @description Default function
     * @param message {W_Message} Сообщение с сервера
     */
    public run = async (message: W_Message): Promise<unknown> => {
        if (message.author.bot || message.channel.type === "DM") return;
        const prefix = message.client.cfg.Bot.prefix;
        const args = message.content.split(" ").slice(1);

        return this._getCommand(message, prefix, args);
    };
    /**
     * @description Ищем команду в базе
     * @param message {W_Message} Сообщение с сервера
     * @param prefix {string} Префикс
     * @param args {string[]} Аргументы
     */
    private _getCommand = async (message: W_Message, prefix: string, args: string[]): Promise<unknown> => {
        if (!message.content.startsWith(prefix)) return;
        let cmd = message.content.slice(prefix.length).trim().split(/ +/g).shift().toLowerCase();
        let command = message.client.commands.get(cmd) || message.client.commands.get(message.client.aliases.get(cmd));
        return this._checkDataCommand(message, command, prefix, args);
    };
    /**
     * @description Проверяем необходимые данные которые указаны в команде
     * @param message {W_Message} Сообщение с сервера
     * @param command {Command} Найденная команда
     * @param prefix {string} Префикс
     * @param args {string[]} Аргументы
     */
    private _checkDataCommand = async (message: W_Message, command: Command, prefix: string, args: string[]): Promise<unknown> => {
        const perm = await this._permissions(message, command).catch(() => false);
        const isOwner = await this._isOwner(message, command).catch(() => false);
        if (isOwner || perm) return null;
        return this._runCommand(command, prefix, args, message);
    };
    /**
     * @description Запускаем команду или говорим что ее нет
     * @param command {Command} Найденная команда
     * @param prefix {string} Префикс
     * @param args {string[]} Аргументы
     * @param message {W_Message} Сообщение с сервера
     */
    private _runCommand = async (command: Command, prefix: string, args: string[], message: W_Message): Promise<unknown> => {
        if (command) return command.run(message, args);
        return message.client.Send({ text: `${message.author}, Я не нахожу такой команды, используй ${prefix}help  :confused:`, message: message, color: 'RED'});
    };
    //Проверяем message.author is owner
    private _isOwner = async (message: W_Message, {isOwner}: Command): Promise<void | boolean> => isOwner && message.author.id !== '312909267327778818' ? message.client.Send({ text: `${message.author}, Эта команда не для тебя!`, message: message, color: 'RED'}) : false;
    //Проверяем права доступа
    private _permissions = async (message: W_Message, {permissions}: Command): Promise<void | boolean> => permissions?.user ? this._permUser(permissions.user, message) : permissions?.client ? this._permClient(permissions.client, message) : false;
    //Права message.author
    private _permUser = async (cmdPerm: any[], message: W_Message): Promise<void | boolean> => new UserPermissions().PermissionSize(cmdPerm, message);
    //Права бота
    private _permClient = async (cmdPerm: any[], message: W_Message): Promise<void | boolean> => new ClientPermissions().PermissionSize(cmdPerm, message);
}
//Проверка прав бота и вывод их в текстовый канал
class ClientPermissions {
    PermissionSize = async (cmdPerm: PermissionResolvable[], message: W_Message): Promise<void | boolean> => {
        if (cmdPerm.length > 1) return this._createPresencePerm(cmdPerm, message);
        return this._createPresenceOnePerm(cmdPerm, message);
    };
    private _createPresenceOnePerm = async (cmdPerm: PermissionResolvable[], message: W_Message): Promise<void | boolean> => !message.guild.me.permissions.has(cmdPerm[0]) ? this.SendMessage(new NotPermissions(message, `У меня нет таких прав!`, `•${cmdPerm[0]}`), message) : false;
    private _createPresencePerm = async (cmdPerm: PermissionResolvable[], message: W_Message): Promise<void | boolean> => {
        let resp = await this._parsePermissions(cmdPerm, message);
        if (resp !== '') return this.SendMessage(new NotPermissions(message, `У меня нет таких прав!`, resp), message);
        return false;
    };
    private _parsePermissions = async (cmdPerm: PermissionResolvable[], message: W_Message, resp: string = ''): Promise<string> => {
        for (let i in cmdPerm) {
            if (!message.guild?.me?.permissions?.has(cmdPerm[i])) resp += `•${cmdPerm[i]}\n`;
        }
        return resp;
    };
    private SendMessage = async (embed: MessageEmbed, message: W_Message): Promise<void> => this.DeleteMessage(message.channel.send({embeds: [embed]}));
    private DeleteMessage = async (send: any): Promise<void> => this.ErrorMessage(send.then(async (msg: W_Message) => setTimeout(async () => msg.delete().catch(() => null)), 12000));
    private ErrorMessage = async (send: any): Promise<void> => send.catch(() => null);
}

//Проверка прав message.author и вывод их в текстовый канал
class UserPermissions {
    PermissionSize = async (cmdPerm: PermissionResolvable[], message: W_Message): Promise<void | boolean> => {
        if (cmdPerm.length > 1) return this._createPresencePerm(cmdPerm, message);
        return this.CreatePresenceOnePerm(cmdPerm, message);
    };
    private _createPresencePerm = async (cmdPerm: PermissionResolvable[], message: W_Message): Promise<void | boolean> => {
        let resp = await this._parsePermissions(cmdPerm, message);
        if (resp !== '') return this.SendMessage(new NotPermissions(message, `У тебя нет таких прав!`, resp), message);
        return false;
    };
    private CreatePresenceOnePerm = async (cmdPerm: PermissionResolvable[], message: W_Message): Promise<void | boolean> => !message.member.permissions.has(cmdPerm[0]) ? this.SendMessage(new NotPermissions(message, `У тебя нет таких прав!`, `•${cmdPerm[0]}`), message) : false;
    private _parsePermissions = async (cmdPerm: PermissionResolvable[], message: W_Message, resp: string = ''): Promise<string> => {
        for (let i in cmdPerm) {
            if (!message.member.permissions.has(cmdPerm[i])) resp += `•${cmdPerm[i]}\n`;
        }
        return resp;
    };
    private SendMessage = async (embed: MessageEmbed, message: W_Message): Promise<void> => this.DeleteMessage(message.channel.send({embeds: [embed]}));
    private DeleteMessage = async (send: any): Promise<void> => this.ErrorMessage(send.then(async (msg: W_Message) => setTimeout(async () => msg.delete().catch(() => null)), 12000));
    private ErrorMessage = async (send: any): Promise<void> => send.catch(() => null);
}

//Embed сообщение
class NotPermissions extends MessageEmbed {
    constructor(message: W_Message, name: string, text: string) {
        super({
            color: "#03f0fc",
            author: { name: message.author.username, icon_url: message.author.displayAvatarURL({}) },
            thumbnail: { url: message.client.user.displayAvatarURL({}) },
            fields: [{ name: name, value: text }],
            timestamp: new Date()
        })
    };
}