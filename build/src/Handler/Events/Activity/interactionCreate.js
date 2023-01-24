"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UtilsMsg = exports.interactionCreate = void 0;
const discord_js_1 = require("discord.js");
const DurationUtils_1 = require("@Managers/DurationUtils");
const ReactionMenu_1 = require("@Structures/ReactionMenu");
const Event_1 = require("@Structures/Handle/Event");
const Config_json_1 = require("@db/Config.json");
const CoolDownBase = new Map();
class interactionCreate extends Event_1.Event {
    name = "interactionCreate";
    isEnable = true;
    run = (message) => {
        if (message?.user.bot || message?.member?.user?.bot || message?.isButton() || !message?.isChatInputCommand() || !message?.isRepliable() || !message?.isCommand())
            return;
        const args = message.options?._hoistedOptions?.map((f) => `${f.value}`);
        const command = message.client.commands.get(message.commandName) ?? message.client.commands.Array.find(cmd => cmd.aliases.includes(message.commandName));
        message.author = message?.member?.user ?? message?.user;
        return interactionCreate.runCommand(message, command, args);
    };
    static runCommand = (message, command, args = []) => {
        const { author } = message;
        if (!command)
            return interactionCreate.sendMessage(message, { text: `${author}, Я не нахожу такой команды!`, color: "DarkRed" });
        if (command.isGuild && !message.guild)
            return interactionCreate.sendMessage(message, { text: `${author}, эта команда не работает вне сервера!`, color: "DarkRed" });
        const owner = interactionCreate.checkOwners(author, command);
        if (owner)
            return interactionCreate.sendMessage(message, owner);
        const permissions = interactionCreate.checkPermissions(command, message);
        if (permissions)
            return interactionCreate.sendMessage(message, permissions);
        const runCommand = command.run(message, args ?? []);
        if (runCommand) {
            if (!(runCommand instanceof Promise))
                return interactionCreate.sendMessage(message, runCommand);
            runCommand.then((data) => interactionCreate.sendMessage(message, data));
        }
    };
    static sendMessage = (message, command) => {
        if ("callbacks" in command && command?.callbacks !== undefined)
            new ReactionMenu_1.ReactionMenu(command.embed, message, command.callbacks);
        else if ("text" in command)
            UtilsMsg.createMessage({ ...command, message });
        else
            UtilsMsg.createMessage({ text: command.embed, message });
    };
    static checkPermissions = (command, message) => {
        const { guild, member, author } = message;
        const permissions = command.permissions;
        if (permissions.client?.length > 0) {
            const ClientString = [];
            for (let i in permissions.client) {
                if (!guild.members.me?.permissions?.has(permissions.client[i]))
                    ClientString.push(permissions.client[i]);
                else
                    break;
            }
            if (ClientString.length > 0)
                return { text: `Внимание ${author.tag}\nУ меня нет прав на: ${ClientString.join(", ")}`, color: "DarkRed", codeBlock: "css" };
        }
        if (permissions.user?.length > 0) {
            const UserString = [];
            for (let i in permissions.user) {
                if (!member.permissions.has(permissions.user[i]))
                    UserString.push(permissions.user[i]);
                else
                    break;
            }
            if (UserString.length > 0)
                return { text: `Внимание ${author.tag}\nУ тебя нет прав на: ${UserString.join(", ")}`, color: "DarkRed", codeBlock: "css" };
        }
        return;
    };
    static checkOwners = (author, command) => {
        if (!Config_json_1.Bot.OwnerIDs.includes(author.id)) {
            if (command.isOwner)
                return { text: `${author}, Эта команда не для тебя!`, color: "DarkRed" };
            if (CoolDownBase.get(author.id))
                return { text: `${author}, ты слишком быстро отправляем сообщения! Подожди ${DurationUtils_1.DurationUtils.ParsingTimeToString(CoolDownBase.get(author.id).time)}`, color: "DarkRed" };
            else {
                CoolDownBase.set(author.id, { time: command.isCLD });
                setTimeout(() => CoolDownBase.delete(author.id), command.isCLD * 1e3 ?? 5e3);
            }
        }
        return;
    };
}
exports.interactionCreate = interactionCreate;
var UtilsMsg;
(function (UtilsMsg) {
    function deleteMessage(message, time = 15e3) {
        if ("deletable" in message)
            setTimeout(() => message.deletable ? message.delete().catch(() => null) : null, time);
        else if ("isRepliable" in message)
            setTimeout(() => message.isRepliable() ? message.deleteReply().catch(() => null) : null, time);
    }
    UtilsMsg.deleteMessage = deleteMessage;
    function createCollector(channel, filter, max = 1, time = 20e3) {
        return channel.createMessageCollector({ filter: filter, max, time });
    }
    UtilsMsg.createCollector = createCollector;
    function createReaction(message, emoji, filter, callback, time = 35e3) {
        deleteMessage(message, time);
        const createReactionCollector = () => message.createReactionCollector({ filter, time }).on("collect", (reaction) => callback(reaction));
        message.react(emoji).then(createReactionCollector);
    }
    UtilsMsg.createReaction = createReaction;
    function createMessage(options) {
        const { message } = options;
        const Args = sendArgs(options);
        const channelSend = sendMessage(message, "isButton" in message, Args);
        channelSend.then(deleteMessage);
        channelSend.catch((err) => console.log(`[Discord Error]: [Send message] ${err}`));
    }
    UtilsMsg.createMessage = createMessage;
    function sendArgs(options) {
        const { color, text, codeBlock, notAttachEmbed } = options;
        if (typeof text === "string") {
            const description = typeof codeBlock === "string" ? `\`\`\`${codeBlock}\n${text}\n\`\`\`` : text;
            if (!notAttachEmbed)
                return { embeds: [{ color: typeof color === "number" ? color : discord_js_1.Colors[color] ?? discord_js_1.Colors.Blue, description }] };
            return { content: description };
        }
        return { embeds: [text] };
    }
    function sendMessage(message, isSlash, args) {
        if (isSlash)
            return message.reply({ ...args, fetchReply: true });
        return message.channel.send({ ...args, fetchReply: true });
    }
})(UtilsMsg = exports.UtilsMsg || (exports.UtilsMsg = {}));
