import { TypedEmitter } from 'tiny-typed-emitter';
import {Queue} from "../Structures/Queue/Queue";
import {AudioPlayer} from "../Audio/AudioPlayer";

type Events = {
    StartTimerDestroyer: (queue: Queue) => void,
    CancelTimerDestroyer: (player: AudioPlayer) => boolean | void
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
    protected onStartTimerDestroyer = (queue: Queue): void => {
        if (!queue) return null;

        const {player, events, channels} = queue;

        if (!this.Timer) this.Timer = setTimeout(() => events.queue.emit('DestroyQueue', queue, channels.message, false), 15e3);

        player.pause();
        this.state = true;
    };
    /**
     * @description Удаляем таймер который удаляет очередь
     * @param player {AudioPlayer} Плеер
     */
    protected onCancelTimerDestroyer = (player: AudioPlayer): boolean | void => {
        if (this.state) {
            this.state = false;

            if (this.Timer) {
                clearTimeout(this.Timer);
                this.Timer = null;
            }

            player.resume();
        }
    };

    public destroy = () => {
        clearTimeout(this.Timer);
        delete this.Timer;
        delete this.state;

        this.removeAllListeners();
    };
}