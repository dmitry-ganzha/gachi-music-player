import {ChannelType, Guild, InternalDiscordGatewayAdapterCreator, StageChannel, VoiceChannel} from "discord.js";
import {DiscordGatewayAdapterCreator, getVoiceConnection, joinVoiceChannel} from "@discordjs/voice";

//Допустимые голосовые каналы
type VoiceChannels = VoiceChannel | StageChannel;

/**
 * Здесь все возможные взаимодействия с голосовым каналом (еще не финал)
 */
export namespace Voice {
    /**
     * @description Подключаемся к голосовому каналу
     * @param id {string} ID канала
     * @param guild {Guild} Сервер
     * @param type {string} Тип канала
     */
    export function Join({id, guild, type}: VoiceChannels) {
        const JoinVoice = joinVoiceChannel({
            selfDeaf: true,
            selfMute: false,
            channelId: id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator as InternalDiscordGatewayAdapterCreator & DiscordGatewayAdapterCreator,
        });
        const me = guild.members?.me;

        //Для голосовых трибун
        if (type !== ChannelType.GuildVoice && me) me?.voice?.setRequestToSpeak(true).catch(() => undefined);

        return JoinVoice;
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Отключаемся от канала
     * @param guild {VoiceChannels | string} ID канала или сам канал
     */
    export function Disconnect(guild: Guild | string) {
        const VoiceConnection = getVoiceConnection(typeof guild === "string" ? guild : guild.id);

        //Если бот подключен к голосовому каналу, то отключаемся!
        if (VoiceConnection) VoiceConnection.disconnect();
    }
}