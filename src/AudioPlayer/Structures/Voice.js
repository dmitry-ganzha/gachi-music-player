"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Voice = void 0;
const discord_js_1 = require("discord.js");
const voice_1 = require("@discordjs/voice");
var Voice;
(function (Voice) {
    function Join({ id, guild, type }) {
        const JoinVoice = (0, voice_1.joinVoiceChannel)({
            selfDeaf: true,
            selfMute: false,
            channelId: id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
        });
        const me = guild.members?.me;
        if (type !== discord_js_1.ChannelType.GuildVoice && me)
            me?.voice?.setRequestToSpeak(true).catch(() => undefined);
        return JoinVoice;
    }
    Voice.Join = Join;
    function Disconnect(guild) {
        const VoiceConnection = (0, voice_1.getVoiceConnection)(typeof guild === "string" ? guild : guild.id);
        if (VoiceConnection)
            VoiceConnection.disconnect();
    }
    Voice.Disconnect = Disconnect;
})(Voice = exports.Voice || (exports.Voice = {}));
