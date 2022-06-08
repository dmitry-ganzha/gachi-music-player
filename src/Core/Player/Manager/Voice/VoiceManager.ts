import { InternalDiscordGatewayAdapterCreator, StageChannel, VoiceChannel, ChannelType, GuildMember } from "discord.js";
import { DiscordGatewayAdapterCreator, getVoiceConnection, joinVoiceChannel, VoiceConnection } from "@discordjs/voice";
import {TypedEmitter} from "tiny-typed-emitter";
import {Queue} from "../../Structures/Queue/Queue";
import {AudioPlayer} from "../../Audio/AudioPlayer";
import {getMe} from "../../../Utils/LiteUtils";

type Events = {
    StartQueueDestroy: (queue: Queue) => void,
    CancelQueueDestroy: (player: AudioPlayer) => boolean | void
};

/**
 * @description Отключение от голосового канала
 * @param GuildID {string} ID сервера
 */
export function Disconnect(GuildID: string) {
    const connection: VoiceConnection | null = getVoiceConnection(GuildID);
    if (connection) connection.disconnect();
}
//====================== ====================== ====================== ======================
/**
 * @description Подключаемся к гс
 * @param id {string} ID голосового канала
 * @param guild {Guild} Сервер к которому подключимся
 * @param type {ChannelType} Тип канала
 * @constructor
 */
export function JoinVoiceChannel({id, guild, type}: VoiceChannel | StageChannel) {
    const VoiceChannel = joinVoiceChannel({
        selfDeaf: true,
        selfMute: false,
        channelId: id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator as InternalDiscordGatewayAdapterCreator & DiscordGatewayAdapterCreator,
    });

    SpeakStateChannel(getMe(guild), type);
    return VoiceChannel;
}
//====================== ====================== ====================== ======================
/**
 * @description Делаем запрос на выступление на трибуне
 * @param me {GuildMember} Бот
 * @param type {ChannelType} Тип канала
 * @constructor
 */
function SpeakStateChannel(me: GuildMember, type: ChannelType.GuildVoice | ChannelType.GuildStageVoice): void {
    if (type === ChannelType.GuildStageVoice && me) me?.voice?.setRequestToSpeak(true).catch(() => undefined);
}
//====================== ====================== ====================== ======================
/**
 * @description Система <QueueDestroy> для удаления очереди и отключения бота от гс!
 */
export class Voice extends TypedEmitter<Events> {
    #Timer: NodeJS.Timeout;
    #state: boolean;

    public constructor() {
        super();
        this.on("StartQueueDestroy", this.#onStartQueueDestroy);
        this.on("CancelQueueDestroy", this.#onCancelQueueDestroy);
        this.setMaxListeners(2);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем таймер (по истечению таймера будет удалена очередь)
     * @param queue {object} Очередь сервера
     */
    #onStartQueueDestroy = (queue: Queue): void => {
        if (!queue) return null;

        const {player, events, channels} = queue;

        if (!this.#Timer) this.#Timer = setTimeout(() => events.queue.emit("DestroyQueue", queue, channels.message, false), 15e3);
        this.#state = true;
        player.pause();
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем таймер который удаляет очередь
     * @param player {AudioPlayer} Плеер
     */
    #onCancelQueueDestroy = (player: AudioPlayer): boolean | void => {
        if (this.#state) {
            this.#state = false;

            if (this.#Timer) clearTimeout(this.#Timer);
            player.resume();
        }
    };

    public destroy = () => {
        clearTimeout(this.#Timer);
        this.removeAllListeners();
    };
}