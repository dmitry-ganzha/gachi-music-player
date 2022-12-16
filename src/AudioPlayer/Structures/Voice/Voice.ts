import {ChannelType,Guild,GuildMember,InternalDiscordGatewayAdapterCreator,StageChannel,VoiceChannel,VoiceState} from "discord.js";
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
     * @description Все пользователи в голосовом канале
     * @param Guild {Guild} Сервер с которого надо взять данные
     */
    export function Members(Guild: Guild): VoiceState[] | "Fail" {
        const connection = getVoice(Guild.id), Users: VoiceState[] = [];

        if (connection) Guild.voiceStates.cache.forEach((state: VoiceState): any => {
            if (!(state.channelId === connection.joinConfig.channelId && state.guild.id === connection.joinConfig.guildId)) return;
            Users.push(state);
        });

        return Users.length > 0 ? Users : "Fail";
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем голосовое подключение
     * @param guildID {string} ID сервера
     */
    export function getVoice(guildID: string) { return getVoiceConnection(guildID); }
}