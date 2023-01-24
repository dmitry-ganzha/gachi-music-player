"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command_Join = void 0;
const Command_1 = require("@Structures/Handle/Command");
const _VoiceManager_1 = require("@VoiceManager");
class Command_Join extends Command_1.Command {
    constructor() {
        super({
            name: "join",
            aliases: ["summon", "j"],
            description: 'Подключение к вашему голосовому каналу!',
            permissions: {
                user: null,
                client: ['Speak', 'Connect']
            },
            isGuild: true,
            isSlash: true,
            isEnable: true,
        });
    }
    ;
    run = (message) => {
        const { author, member, guild } = message;
        const voiceChannel = member.voice.channel;
        const queue = message.client.queue.get(guild.id);
        if (!member?.voice?.channel || !member?.voice)
            return { text: `${author}, Подключись к голосовому каналу!`, color: "DarkRed" };
        if (voiceChannel.id === guild.members.me.voice.id)
            return { text: `${author}, Я уже в этом канале <#${queue.voice.id}>.`, color: "DarkRed" };
        if (queue) {
            if (queue.options.radioMode)
                return { text: `${author}, Невозможно из-за включенного режима радио!`, color: "DarkRed" };
            const connection = _VoiceManager_1.Voice.Join(voiceChannel);
            queue.message = message;
            queue.voice = voiceChannel;
            queue.player.voice = connection;
            queue.TimeDestroying("cancel");
            return;
        }
        _VoiceManager_1.Voice.Join(voiceChannel);
        return;
    };
}
exports.Command_Join = Command_Join;
