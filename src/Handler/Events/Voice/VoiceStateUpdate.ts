import {VoiceState} from "discord.js";
import {Queue} from "../../../AudioPlayer/Structures/Queue/Queue";
import {WatKLOK} from "../../../Core/Client/Client";
import {Event} from "../../../Structures/Event";
import {Voice} from "../../../AudioPlayer/Structures/Voice";

export class voiceStateUpdate extends Event<VoiceState, VoiceState> {
    public readonly name: string = "voiceStateUpdate";
    public readonly enable: boolean = true;

    public readonly run = (oldState: VoiceState, newState: VoiceState, client: WatKLOK): void => {
        const queue: Queue = client.queue.get(newState.guild.id); //Очередь сервера
        const Guild = oldState.guild;

        setImmediate(() => {
            const UsersVoiceChannel = client.connections(Guild); //Все пользователи подключенные к голосовому каналу на сервере

            //Бот не подключен к голосовому каналу
            if (UsersVoiceChannel === 404) {
                if (queue) queue.TimeDestroying("start");
                return;
            }

            //Все пользователи вышли из чата
            if (!newState.channel?.members && UsersVoiceChannel.length < 2) {
                if (queue) queue.TimeDestroying("start");
                Voice.Disconnect(Guild);

                return;
            }

            const FilterVoiceChannel: VoiceState[] = UsersVoiceChannel.filter((fn) => !fn.member.user.bot); //Фильтруем пользователей чтоб боты не слушали музыку

            //Если пользователей нет в голосовом канале
            if (FilterVoiceChannel.length === 0) {
                //Если есть очередь сервера, удаляем!
                if (queue) queue.TimeDestroying("start");
            } else {
                //Если есть очередь сервера, удаляем!
                if (queue) queue.TimeDestroying("cancel");
            }
        });
    };
}