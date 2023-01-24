"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Leave = void 0;
const Command_1 = require("@Structures/Handle/Command");
const _VoiceManager_1 = require("@VoiceManager");
class Command_Leave extends Command_1.Command {
    constructor() {
        super({
            name: "leave",
            description: "Отключение от голосового канала!",
            isGuild: true,
            isEnable: true,
            isSlash: true
        });
    }
    ;
    run = (message) => {
        const { guild, member, author, client } = message;
        const queue = client.queue.get(guild.id);
        const actVoice = _VoiceManager_1.Voice.getVoice(guild.id);
        if (!actVoice)
            return { text: `${author}, я не подключен к голосовому каналу!`, color: "DarkRed" };
        if (queue && queue.voice && member?.voice?.channel?.id !== queue.voice.id)
            return {
                text: `${author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.voice.id}>`, color: "DarkRed"
            };
        if (queue && queue.options.radioMode)
            return { text: `${author}, я не могу отключится из-за включенного режима радио!` };
        _VoiceManager_1.Voice.Disconnect(guild.id);
        if (queue)
            return { text: `${author}, отключение от голосового канала! Очередь будет удалена через **20 сек**!` };
    };
}
exports.Command_Leave = Command_Leave;
