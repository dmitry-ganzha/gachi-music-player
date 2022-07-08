import {VoiceState} from "discord.js";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {WatKLOK} from "../../Core/Client";
import {DisconnectVoiceChannel} from "../../Core/Player/Structures/Voice";

export class voiceStateUpdate {
    public readonly name: string = "voiceStateUpdate";
    public readonly enable: boolean = true;

    public readonly run = (oldState: VoiceState, newState: VoiceState, client: WatKLOK): void => {
        const queue: Queue = client.queue.get(newState.guild.id); //Очередь сервера
        const UsersVoiceChannel = client.connections(newState?.guild); //Все пользователи подключенные к голосовому каналу на сервере
        const FilterVoiceChannel: VoiceState[] = UsersVoiceChannel.filter((fn) => !fn.member.user.bot); //Фильтруем пользователей чтоб боты не слушали музыку

        //Если пользователей нет в голосовом канале
        if (FilterVoiceChannel.length === 0) {
            this.#LeaveVoice(newState.guild.id); //Отключаемся

            //Если есть очередь сервера, удаляем!
            if (queue) queue.events?.voice?.emit("StartQueueDestroy", queue);
        }
    };
    //Отключаемся от голосового канала
    #LeaveVoice = (GuildID: string) => DisconnectVoiceChannel(GuildID);
}