import {
    DiscordGatewayAdapterCreator,
    entersState,
    getVoiceConnection,
    joinVoiceChannel,
    VoiceConnection,
    VoiceConnectionDisconnectReason,
    VoiceConnectionStatus
} from "@discordjs/voice";
import {Guild, InternalDiscordGatewayAdapterCreator, StageChannel, VoiceChannel, ChannelType} from "discord.js";

export class VoiceManager {
    //public getVoice = (GuildID: string): VoiceConnection => getVoiceConnection(GuildID);
    /**
     * @description Подключаемся к голосовому каналу
     * @param VoiceChannel {VoiceChannel | VoiceConnection} Voice канал
     * @param options {mute: boolean} Доп опции
     */
    public Join = ({id, guild, type}: VoiceChannel | StageChannel, options: {mute: boolean} = {mute: true}): VoiceConnection => {
        this.SpeakStateChannel(guild, type);

        const VoiceConnection = getVoiceConnection(id) ?? joinVoiceChannel({
            channelId: id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator as InternalDiscordGatewayAdapterCreator & DiscordGatewayAdapterCreator,
            selfDeaf: options?.mute
        });

        try {
            VoiceConnection.on("stateChange", async (oldState: any, newState: { status: any; reason: any; closeCode: number }): Promise<VoiceConnection | void | NodeJS.Timeout> => {
                if (newState.status === VoiceConnectionStatus.Disconnected) {
                    if (newState.reason === VoiceConnectionDisconnectReason.WebSocketClose && newState.closeCode === 4014) {
                        try {
                            return entersState(VoiceConnection, VoiceConnectionStatus.Connecting, 5e3);
                        } catch {
                            return VoiceConnection.destroy();
                        }
                    } else if (VoiceConnection.rejoinAttempts < 5) return setTimeout(() => {
                        VoiceConnection.rejoinAttempts++;
                        return VoiceConnection.rejoin();
                    }, 5e3);
                }
                return;
            });
        } catch (e) {
            console.log(`[${(new Date).toLocaleString("ru")}] [VoiceConnection]: [ID: ${id}]: [stateChange]: ${e}`);
        }
        return VoiceConnection;
    };
    /**
     * @description Отключение от голосового канала
     * @param GuildID {string} ID сервера
     */
    public Disconnect = (GuildID: string): void | null => {
        const connection: VoiceConnection | null = getVoiceConnection(GuildID);
        if (connection) return connection.destroy();
        return null;
    };
    /**
     * @description Отправить запрос на передачу музыки на трибуне
     * @param guild {Guild} Сервер
     * @param type {string} Тип голосового канала
     */
    protected SpeakStateChannel = ({me}: Guild, type: ChannelType.GuildVoice | ChannelType.GuildStageVoice): void => {
        if (me.voice.mute) me.voice.setMute(false).catch(() => undefined);
        if (type === ChannelType.GuildStageVoice && me) me?.voice.setRequestToSpeak(true).catch(() => undefined);
    };
}