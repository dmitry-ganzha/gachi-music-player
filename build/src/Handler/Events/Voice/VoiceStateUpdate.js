"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.voiceStateUpdate = void 0;
const Client_1 = require("@Client/Client");
const Event_1 = require("@Structures/Handle/Event");
const Config_json_1 = require("@db/Config.json");
const _VoiceManager_1 = require("@VoiceManager");
class voiceStateUpdate extends Event_1.Event {
    name = "voiceStateUpdate";
    isEnable = true;
    run = (oldState, newState, client) => {
        const queue = client.queue.get(newState.guild.id);
        const ChannelID = oldState?.channel?.id || newState?.channel?.id;
        const Guild = oldState.guild;
        setImmediate(() => {
            const voice = _VoiceManager_1.Voice.getVoice(Guild.id), isBotVoice = !!newState.channel?.members?.find((member) => filterClient(client, member)) ?? !!oldState.channel?.members?.find((member) => filterClient(client, member));
            const usersSize = newState.channel?.members?.filter((member) => filterMemberChannel(member, ChannelID))?.size ?? oldState.channel?.members?.filter((member) => filterMemberChannel(member, ChannelID))?.size;
            if (voice && usersSize < 1 && voice.joinConfig.channelId === oldState?.channelId && !queue?.options?.radioMode)
                _VoiceManager_1.Voice.Disconnect(Guild);
            if (queue && !queue?.options?.radioMode) {
                if (usersSize < 1 && !isBotVoice)
                    queue.TimeDestroying("start");
                else if (usersSize > 0)
                    queue.TimeDestroying("cancel");
            }
            if (Config_json_1.Debug)
                (0, Client_1.consoleTime)(`[Debug] -> voiceStateUpdate: [Voice: ${!!voice} | inVoice: ${isBotVoice} | Users: ${usersSize} | Queue: ${!!queue}]`);
        });
    };
}
exports.voiceStateUpdate = voiceStateUpdate;
function filterMemberChannel(member, channelID) {
    return !member.user.bot && member.voice?.channel?.id === channelID;
}
function filterClient(client, member) {
    return member.user.id === client.user.id;
}
