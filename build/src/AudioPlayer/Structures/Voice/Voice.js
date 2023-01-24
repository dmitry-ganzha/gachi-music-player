"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Voice = void 0;
const discord_js_1 = require("discord.js");
const voice_1 = require("@discordjs/voice");
const VoiceChannelsGroup = "A";
var Voice;
(function (Voice) {
    function Join({ id, guild, type }) {
        const JoinVoice = (0, voice_1.joinVoiceChannel)({ selfDeaf: true, selfMute: false, channelId: id, guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator, group: VoiceChannelsGroup });
        const me = guild.members?.me;
        if (type !== discord_js_1.ChannelType.GuildVoice && me)
            me?.voice?.setRequestToSpeak(true).catch(() => undefined);
        return JoinVoice;
    }
    Voice.Join = Join;
    function Disconnect(guild) {
        const VoiceConnection = getVoice(typeof guild === "string" ? guild : guild.id);
        if (VoiceConnection) {
            VoiceConnection.disconnect();
            (0, voice_1.getVoiceConnections)(VoiceChannelsGroup).delete(VoiceConnection.joinConfig.guildId);
        }
    }
    Voice.Disconnect = Disconnect;
    function Members(Guild) {
        const connection = getVoice(Guild.id), Users = [];
        if (connection)
            Guild.voiceStates.cache.forEach((state) => {
                if (!(state.channelId === connection.joinConfig.channelId && state.guild.id === connection.joinConfig.guildId))
                    return;
                Users.push(state);
            });
        return Users.length > 0 ? Users : "Fail";
    }
    Voice.Members = Members;
    function getVoice(guildID) { return (0, voice_1.getVoiceConnection)(guildID, VoiceChannelsGroup); }
    Voice.getVoice = getVoice;
})(Voice = exports.Voice || (exports.Voice = {}));
