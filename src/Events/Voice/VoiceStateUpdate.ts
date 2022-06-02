import {VoiceState} from "discord.js";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {WatKLOK} from "../../Core/Client";

export class voiceStateUpdate {
    public readonly name: string = 'voiceStateUpdate';
    public readonly enable: boolean = true;

    public run = ({guild}: VoiceState, newState: VoiceState, client: WatKLOK): void => {
        const queue: Queue = client.queue.get(guild.id);

        if (!queue) return;

        setImmediate(() => {
            const voiceConnection: VoiceState[] = client.connections(guild); //Все пользователи в гс который нам надо
            const FilterVoiceChannel: VoiceState[] = voiceConnection.filter((fn) => guild.members.cache.get(fn.id).user.bot); //Фильтруем пользователей чтоб боты не слушали музыку

            if (!voiceConnection.find((fn: VoiceState) => fn.id === client.user.id)) { //Если бота нет в гс
                queue.songs = [];
                queue.options.stop = true;
                return void queue.events.queue.emit('DestroyQueue', queue, queue.channels.message);
            }

            if (!FilterVoiceChannel) return void queue.events.helper.emit('StartQueueDestroy', queue); //Если нет слушателей, удаляем очередь
            else if (queue.events.helper.DestroyStart) return void queue.events.helper.emit('CancelQueueDestroy', queue.player); //Если они есть, отмена удаления очереди
        });
    };
}