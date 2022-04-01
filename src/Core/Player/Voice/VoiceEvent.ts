import { TypedEmitter } from 'tiny-typed-emitter';
import {Queue} from "../Queue/Structures/Queue";

type Events = {
    StartTimerDestroyer: (queue: Queue) => boolean | null,
    CancelTimerDestroyer: (queue: Queue) => boolean | null
};

export class VoiceEvent extends TypedEmitter<Events> {
    protected Timer: NodeJS.Timeout;
    protected state: boolean;

    public constructor() {
        super();
        this.on('StartTimerDestroyer', this.onStartTimerDestroyer);
        this.on('CancelTimerDestroyer', this.onCancelTimerDestroyer);
        this.setMaxListeners(2);
    };
    /**
     * @description Создаем таймер (по истечению таймера будет удалена очередь)
     * @param queue {object} Очередь сервера
     */
    protected onStartTimerDestroyer = (queue: Queue): boolean | null => {
        if (!queue) return null;

        const {player, options, events, channels} = queue;

        player.pause();
        this.state = true;
        if (!this.Timer) this.Timer = setTimeout(async () => {
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
    protected onCancelTimerDestroyer = ({player}: Queue): boolean | null => {
        if (this.state === true) {
            this.state = false;
            clearTimeout(this.Timer);
            this.Timer = null;
            return player.unpause();
        }
        return null;
    };

    public destroy = () => {
        clearTimeout(this.Timer);
        delete this.Timer;
        delete this.state;

        this.removeAllListeners();
    };
}