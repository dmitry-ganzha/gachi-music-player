"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JoinVoiceChannel = exports.Disconnect = void 0;
const voice_1 = require("@discordjs/voice");
const discord_js_1 = require("discord.js");
function Disconnect(GuildID) {
    const connection = (0, voice_1.getVoiceConnection)(GuildID);
    if (connection)
        return connection.destroy();
    return null;
}
exports.Disconnect = Disconnect;
class JoinVoiceChannel {
    constructor({ id, guild, type }) {
        this.SpeakStateChannel = (me, type) => {
            if (type === discord_js_1.ChannelType.GuildStageVoice && me)
                me?.voice.setRequestToSpeak(true).catch(() => undefined);
        };
        this.destroy = () => {
            try {
                this.VoiceConnection?.destroy();
            }
            catch { }
            this.VoiceConnection?.removeAllListeners();
            delete this.VoiceConnection;
            delete this.me;
        };
        this.VoiceConnection = (0, voice_1.joinVoiceChannel)({
            channelId: id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator,
            selfDeaf: true
        });
        this.me = guild.me.voice;
        this.SpeakStateChannel(guild.me, type);
        ["destroyed", "disconnected"].map(event => this.VoiceConnection.once(event, this.destroy));
    }
    ;
    get isMute() {
        return this.me.mute;
    }
    ;
    set setMute(state) {
        if (this.me.mute === state)
            return;
        Promise.all([this.me.setMute(state)]).catch(() => new Error('[JoinVoiceChannel]: [setMute]: Fail disable mute a bot'));
    }
    ;
    set subscribe(player) {
        if (!this.VoiceConnection)
            return;
        this.VoiceConnection.subscribe(player);
    }
    ;
}
exports.JoinVoiceChannel = JoinVoiceChannel;
