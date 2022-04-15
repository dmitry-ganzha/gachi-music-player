import {Guild, InternalDiscordGatewayAdapterCreator, StageChannel, VoiceChannel, ChannelType} from "discord.js";
import {AudioPlayer} from "../Audio/AudioPlayer";
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
    if (connection) return connection.destroy();
    return null;

}

export class JoinVoiceChannel {
    public VoiceConnection: VoiceConnection;
    protected meVoice: Guild["me"]["voice"];

    public constructor({id, guild, type}: VoiceChannel | StageChannel) {
        this.VoiceConnection = joinVoiceChannel({
            selfDeaf: true,
            selfMute: false,
            channelId: id,
            guildId: guild.id,
            adapterCreator: guild.voiceAdapterCreator as InternalDiscordGatewayAdapterCreator & DiscordGatewayAdapterCreator,
        })
        this.meVoice = guild.me.voice;
        this.SpeakStateChannel(guild.me, type);
        // @ts-ignore
        ["destroyed", "disconnected"].map((event) => this.VoiceConnection.once(event, this.destroy));
    };

    /*
    //Включен микрофон бота?
    public get isMute() {
        return this.meVoice.mute;
    };
    //Задаем <boolean> значение для микрофона
    public set setMute(state: boolean) {
        if (this.meVoice.mute === state) return;
        Promise.all([this.meVoice.setMute(state)]).catch(() => new Error('[JoinVoiceChannel]: [setMute]: Fail disable mute a bot'));
    };

     */

    public set subscribe(player: AudioPlayer) {
        if (!this.VoiceConnection) return;
        this.VoiceConnection.subscribe(player as any);
    };

    /**
     * @description Отправить запрос на передачу музыки на трибуне
     * @param me {<Guild>me}
     * @param type {string} Тип голосового канала
     */
    protected SpeakStateChannel = (me: Guild["me"], type: ChannelType.GuildVoice | ChannelType.GuildStageVoice): void => {
        if (type === ChannelType.GuildStageVoice && me) me?.voice.setRequestToSpeak(true).catch(() => undefined);
    };

    protected destroy = () => {
        if (this.VoiceConnection.state.status !== "destroyed") {
            this.VoiceConnection?.destroy();
            this.VoiceConnection?.removeAllListeners();
        }

        delete this.VoiceConnection;
        delete this.meVoice;
    };
}