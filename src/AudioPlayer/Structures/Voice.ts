import {ChannelType, Guild, InternalDiscordGatewayAdapterCreator, StageChannel, VoiceChannel} from "discord.js";
import {DiscordGatewayAdapterCreator, getVoiceConnection, getVoiceConnections, joinVoiceChannel} from "@discordjs/voice";

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
        const JoinVoice = joinVoiceChannel({ selfDeaf: true, selfMute: false, channelId: id, guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator as InternalDiscordGatewayAdapterCreator & DiscordGatewayAdapterCreator });
        const me = guild.members?.me;

        JoinVoice.on("error", (error) => {
            //Если бот потеряет подключение к интернету он переподключиться через 15 сек
           if (error.message.match(/getaddrinfo ENOTFOUND/)) setTimeout(() => JoinVoice.rejoin(), 15e3);

           return console.log(`[VoiceConnection]: ${error}`);
        });

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
        const VoiceConnection = getVoice(typeof guild === "string" ? guild : guild.id);

        //Если бот подключен к голосовому каналу, то отключаемся!
        if (VoiceConnection) {
            VoiceConnection.disconnect();

            //Удаляем канал из базы @discordjs/voice
            getVoiceConnections("default").delete(VoiceConnection.joinConfig.guildId);
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем голосовое подключение
     * @param guildID {string} ID сервера
     */
    export function getVoice(guildID: string) { return getVoiceConnection(guildID); }
}