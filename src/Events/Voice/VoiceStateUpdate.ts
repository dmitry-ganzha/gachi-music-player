import {Guild, VoiceState} from "discord.js";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {WatKLOK} from "../../Core/Client";
import {getVoiceConnection} from "@discordjs/voice";
import {DisconnectVoiceChannel} from "../../Core/Player/Structures/Voice";

export class voiceStateUpdate {
    public readonly name: string = "voiceStateUpdate";
    public readonly enable: boolean = true;

    public run = (oldState: VoiceState, newState: VoiceState, client: WatKLOK): void => {
        const queue: Queue = client.queue.get(newState.guild.id); //Очередь сервера
        const VoiceConnection = getVoiceConnection(newState.guild.id); //Подключение к голосовому каналу
        const FilterVoiceChannel: VoiceState[] = this.#FilterVoiceChannel(client, newState.guild).filter((fn) => !fn.member.user.bot); //Фильтруем пользователей чтоб боты не слушали музыку

        //Что делаем с голосовым каналом
        if (FilterVoiceChannel && VoiceConnection) {
            if (FilterVoiceChannel.length >= 1) return; //Если есть один пользователь в голосовом канале, нечего не делаем!

            setTimeout(() => {
                DisconnectVoiceChannel(VoiceConnection.joinConfig.guildId); //Отключаемся от голосового канала поскольку в нем нет пользователей
            }, 700);
        }
        const FindBotVoiceChannel = this.#FilterVoiceChannel(client, newState.guild).find((fn: VoiceState) => fn.id === client.user.id); //Есть ли бот в гс

        //Если есть очередь сервера, используем с пользой
        if (queue) {
            if (!FindBotVoiceChannel) return void queue.events?.voice?.emit("StartQueueDestroy", queue); //Если нет слушателей, удаляем очередь
            queue.events?.voice?.emit("CancelQueueDestroy", queue.player); //Выключаем таймер, чтоб очередь жила дальше
        }

    };
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем Array<VoiceState>, все пользователи в голосовом канале. Не считая ботов!
     * @param client {WatKLOK} Клиент
     * @param guild {Guild} Сервер
     * @private
     */
    #FilterVoiceChannel = (client: WatKLOK, guild: Guild) => {
        const voiceConnections: VoiceState[] = client.connections(guild); //Все пользователи в гс который нам надо
        return voiceConnections.filter((fn) => !fn.member.user.bot); //Фильтруем пользователей чтоб боты не слушали музыку
    };
}