import {VoiceState} from "discord.js";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {WatKLOK} from "../../Core/Client";
import {getVoiceConnection} from "@discordjs/voice";
import {DisconnectVoiceChannel} from "../../Core/Player/Structures/Voice";

export class voiceStateUpdate {
    public readonly name: string = "voiceStateUpdate";
    public readonly enable: boolean = true;

    public readonly run = (oldState: VoiceState, newState: VoiceState, client: WatKLOK): void => {
        const queue: Queue = client.queue.get(newState.guild.id); //Очередь сервера
        const VoiceConnection = getVoiceConnection(newState.guild.id); //Подключение к голосовому каналу
        const UsersVoiceChannel = client.connections(newState?.guild); //Все пользователи подключенные к голосовому каналу на сервере
        const FilterVoiceChannel: VoiceState[] = UsersVoiceChannel.filter((fn) => !fn.member.user.bot); //Фильтруем пользователей чтоб боты не слушали музыку
        const FindBotVoiceChannel = !!UsersVoiceChannel.find((fn: VoiceState) => fn.id === client.user.id); //Есть ли бот в гс

        //Если пользователей нет в голосовом канале отключаемся
        if (FilterVoiceChannel.length === 0) this.#LeaveVoice(VoiceConnection.joinConfig.guildId);

        //Если есть очередь сервера, запускаем таймер по истечению которого будет удалена очередь
        if (queue) {
            if (!FindBotVoiceChannel) queue.events?.voice?.emit("StartQueueDestroy", queue); //Если нет слушателей, удаляем очередь
            else queue.events?.voice?.emit("CancelQueueDestroy", queue.player); //Выключаем таймер, чтоб очередь жила дальше
        }
    };
    //Отключаемся от голосового канала
    #LeaveVoice = (GuildID: string) => setTimeout(() => DisconnectVoiceChannel(GuildID), 1e3);
}