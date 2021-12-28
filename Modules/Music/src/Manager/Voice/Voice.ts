import {DiscordGatewayAdapterCreator, getVoiceConnection, joinVoiceChannel, VoiceConnection} from "@discordjs/voice";
import {InternalDiscordGatewayAdapterCreator, StageChannel, VoiceChannel} from "discord.js";

export class VoiceManager {
    public getVoice = (GuildID: string): VoiceConnection => getVoiceConnection(GuildID);
    /**
     * @description Подключаемся к голосовому каналу
     * @param VoiceChannel {VoiceChannel | VoiceConnection} Voice канал
     * @param options {mute: boolean} Доп опции
     */
    public Join = (VoiceChannel: VoiceChannel | StageChannel, options?: {mute: boolean}): VoiceConnection => {
        this.SpeakStateChannel(VoiceChannel.guild, VoiceChannel.type);

        const {id, guild} = VoiceChannel;
        return getVoiceConnection(id) ?? joinVoiceChannel({
            channelId: id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator as InternalDiscordGatewayAdapterCreator & DiscordGatewayAdapterCreator,
            selfDeaf: options?.mute
        });
    }
    /**
     * @description Отключение от голосового канала
     * @param GuildID {string} ID сервера
     */
    public Disconnect = (GuildID: string): void => {
        const connection: VoiceConnection | null = getVoiceConnection(GuildID);
        if (connection) return connection.destroy();
        return null;
    }
    /**
     * @description Отправить запрос на передачу музыки на трибуне
     * @param guild {object} Сервер
     * @param type {string} Тип голосового канала
     * @constructor
     */
    private SpeakStateChannel = (guild: any, type: string): void => {
        if (type === 'GUILD_STAGE_VOICE' && guild.me) guild.me.voice.setRequestToSpeak(true).catch(() => undefined);
    }
}