import {EventEmitter} from 'events';
import {Queue} from "../../Manager/Queue/Constructors/Queue";

export class VoiceEvents extends EventEmitter {
    constructor() {
        super();
        this.on('StartTimerDestroyer', this.onStartTimerDestroyer);
        this.on('CancelTimerDestroyer', this.onCancelTimerDestroyer);
        this.setMaxListeners(2);
    };
    /**
     * @description Создаем таймер (по истечению таймера будет удалена очередь)
     * @param queue {object}
     */
    private onStartTimerDestroyer = async ({player, AutoDisconnect, songs, options, channels, events}: Queue): Promise<void> => {
        player.pause(true);
        AutoDisconnect.state = true;
        if (!AutoDisconnect.timer) AutoDisconnect.timer = setTimeout(async () => {
            songs = [];
            options.stop = true;
            return events.queue.emit('DestroyQueue', {songs, player, options, channels, events}, channels.message, false);
        }, 2e4);
        return null;
    };
    /**
     * @description Удаляем таймер который удаляет очередь
     * @param queue {object}
     */
    private onCancelTimerDestroyer = async ({AutoDisconnect, player}: Queue): Promise<void> => {
        if (AutoDisconnect.state === true) {
            AutoDisconnect.state = false;
            clearTimeout(AutoDisconnect.timer);
            AutoDisconnect.timer = null;
            return player.unpause();
        }
        return null;
    };
}