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

        const {player, options, events, channels} = queue;

        player.pause();
        this.state = true;

        if (!this.Timer) {
            this.Timer = setTimeout(() => {
                queue.songs = [];
                options.stop = true;
                events.queue.emit('DestroyQueue', queue, channels.message, false);
            }, 2e4);
        }
    };
    /**
     * @description Удаляем таймер который удаляет очередь
     * @param player {AudioPlayer} Преер
     */
    protected onCancelTimerDestroyer = (player: AudioPlayer): boolean | void => {
        if (this.state === true) {
            this.state = false;
            clearTimeout(this.Timer);
            this.Timer = null;
            return player.resume();
        }
    };

    public destroy = () => {
        clearTimeout(this.Timer);
        delete this.Timer;
        delete this.state;

        this.removeAllListeners();
    };
}