"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageCreate = void 0;
const interactionCreate_1 = require("./interactionCreate");
const Event_1 = require("@Structures/Handle/Event");
const Config_json_1 = require("@db/Config.json");
const { runCommand } = interactionCreate_1.interactionCreate;
class messageCreate extends Event_1.Event {
    name = "messageCreate";
    isEnable = true;
    run = (message) => {
        if (message?.author?.bot || !message.content?.startsWith(Config_json_1.Bot.prefix))
            return;
        if (Config_json_1.Bot.TypingMessage)
            message.channel.sendTyping().catch((e) => console.warn(e.message));
        setTimeout(() => interactionCreate_1.UtilsMsg.deleteMessage(message), 15e3);
        const args = message.content.split(" ").slice(1);
        const commandName = message.content?.split(" ")[0]?.slice(Config_json_1.Bot.prefix.length)?.toLowerCase();
        const command = message.client.commands.get(commandName) ?? message.client.commands.Array.find(cmd => cmd.aliases.includes(commandName));
        return runCommand(message, command, args);
    };
}
exports.messageCreate = messageCreate;
