import {VoiceState} from "discord.js";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {WatKLOK} from "../../Core/Client";

export class voiceStateUpdate {
    public readonly name: string = "voiceStateUpdate";
    public readonly enable: boolean = true;

    public run = (oldState: VoiceState, newState: VoiceState, client: WatKLOK): void => {
        const queue: Queue = client.queue.get(newState.guild.id);

        if (!queue) return;

        const voiceConnection: VoiceState[] = client.connections(newState.guild); //Все пользователи в гс который нам надо

        if (voiceConnection.length === 0) return; //Если нет пользователей в гс

        const FilterVoiceChannel: VoiceState[] = voiceConnection.filter((fn) => !fn.member.user.bot); //Фильтруем пользователей чтоб боты не слушали музыку
        const FindBotVoiceChannel = voiceConnection.find((fn: VoiceState) => fn.id === client.user.id); //Есть ли бот в гс

        setImmediate(() => {
            if (!FindBotVoiceChannel) { //Если бота нет в гс
                queue.songs = [];
                queue.options.stop = true;
                return void queue.events.queue.emit("DestroyQueue", queue, queue.channels.message);
            }

            if (FilterVoiceChannel.length <= 0) return void queue.events.helper.emit("StartQueueDestroy", queue); //Если нет слушателей, удаляем очередь
            return void queue.events.helper.emit("CancelQueueDestroy", queue.player); //Если они есть, отмена удаления очереди
        });
    };
}