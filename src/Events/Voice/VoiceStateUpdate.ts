import {VoiceState} from "discord.js";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {WatKLOK} from "../../Core/Client";
import {Voice} from "../../Core/Player/Structures/Voice";

export default class voiceStateUpdate {
    public readonly name: string = "voiceStateUpdate";
    public readonly enable: boolean = true;

    public readonly run = (oldState: VoiceState, newState: VoiceState, client: WatKLOK): void => {
        const queue: Queue = client.queue.get(newState.guild.id); //Очередь сервера

        setImmediate(() => {
            const UsersVoiceChannel = client.connections(newState?.guild); //Все пользователи подключенные к голосовому каналу на сервере
            const FilterVoiceChannel: VoiceState[] = UsersVoiceChannel.filter((fn) => !fn.member.user.bot); //Фильтруем пользователей чтоб боты не слушали музыку

            //Если пользователей нет в голосовом канале
            if (FilterVoiceChannel.length === 0) {
                this.#LeaveVoice(newState.guild.id); //Отключаемся

                //Если есть очередь сервера, удаляем!
                if (queue) queue.emitter.emit("StartDelete", queue);
            }
        })
    };
    //Отключаемся от голосового канала
    readonly #LeaveVoice = (GuildID: string) => Voice.Disconnect(GuildID);
}