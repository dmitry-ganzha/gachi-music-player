import {Guild, InternalDiscordGatewayAdapterCreator, StageChannel, VoiceChannel, ChannelType} from "discord.js";
import {
    DiscordGatewayAdapterCreator,
    getVoiceConnection,
    joinVoiceChannel,
    VoiceConnection
} from "@discordjs/voice";

/**
 * @description Отключение от голосового канала
 * @param GuildID {string} ID сервера
 */
export function Disconnect(GuildID: string) {
    const connection: VoiceConnection | null = getVoiceConnection(GuildID);
    if (connection) connection.disconnect();
}
export function JoinVoiceChannel({id, guild, type}: VoiceChannel | StageChannel) {
    const VoiceChannel = joinVoiceChannel({
        selfDeaf: true,
        selfMute: false,
        channelId: id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator as InternalDiscordGatewayAdapterCreator & DiscordGatewayAdapterCreator,
    });

    SpeakStateChannel(guild.me, type);
    return VoiceChannel;
}

function SpeakStateChannel(me: Guild["me"], type: ChannelType.GuildVoice | ChannelType.GuildStageVoice): void {
    if (type === ChannelType.GuildStageVoice && me) me?.voice.setRequestToSpeak(true).catch(() => undefined);
}