import { TypedEmitter } from 'tiny-typed-emitter';
import {Queue} from "../../Manager/Queue/Structures/Queue";

type Events = {
    StartTimerDestroyer: (queue: Queue) => Promise<boolean | null>,
    CancelTimerDestroyer: (queue: Queue) => Promise<boolean | null>
};

export class VoiceEvents extends TypedEmitter<Events> {
    #Timer: NodeJS.Timeout;
    #state: boolean;

    public constructor() {
        super();
        this.on('StartTimerDestroyer', this.#onStartTimerDestroyer);
        this.on('CancelTimerDestroyer', this.#onCancelTimerDestroyer);
        this.setMaxListeners(2);
    };
    /**
     * @description Создаем таймер (по истечению таймера будет удалена очередь)
     * @param queue {object} Очередь сервера
     */
    #onStartTimerDestroyer = async (queue: Queue): Promise<boolean | null> => {
        const {player, options, events, channels} = queue;

        player.pause(true);
        this.#state = true;
        if (!this.#Timer) this.#Timer = setTimeout(async () => {
            queue.songs = [];
            options.stop = true;
            return void events.queue.emit('DestroyQueue', queue, channels.message, false);
        }, 2e4);
        return null;
    };
    /**
     * @description Удаляем таймер который удаляет очередь
     * @param queue {object} Очередь сервера
     */
    #onCancelTimerDestroyer = async ({player}: Queue): Promise<boolean | null> => {
        if (this.#state === true) {
            this.#state = false;
            clearTimeout(this.#Timer);
            this.#Timer = null;
            return player.unpause();
        }
        return null;
    };
}