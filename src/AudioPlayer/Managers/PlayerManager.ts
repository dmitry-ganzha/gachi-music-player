import {MessagePlayer} from "./PlayerMessages";
import {Queue} from "../Structures/Queue/Queue";

//Ивенты плеера для всех серверов
export namespace PlayerEventsCallBacks {
    //====================== ====================== ====================== ======================
    /**
     * @description Когда плеер завершит песню, он возвратит эту функцию
     * @param queue {Queue} Сама очередь
     * @requires {isRemoveSong}
     */
    export function onIdlePlayer(queue: Queue): void {
        setTimeout(() => {
            if (queue?.songs) isRemoveSong(queue); //Определяем тип loop

            //Выбираем случайный номер трека, просто меняем их местами
            if (queue?.options?.random) {
                const RandomNumSong = Math.floor(Math.random() * queue.songs.length)
                queue.swapSongs(RandomNumSong);
            }

            return queue.play(); //Включаем трек
        }, 1200);
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Когда плеер выдает ошибку, он возвратит эту функцию
     * @param err {Error | string} Ошибка
     * @param queue {Queue} Сама очередь
     * @param isSkipSong {boolean} Надо ли пропускать трек
     */
    export function onErrorPlayer(err: Error | string, queue: Queue, isSkipSong: boolean): void {
        //Выводим сообщение об ошибке
        MessagePlayer.toError(queue, err);

        setTimeout(() => {
            if (isSkipSong) {
                queue.songs.shift();
                setTimeout(() => queue.play(), 1e3);
            }
        }, 1200);
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Повтор музыки
     * @param queue {Queue} Очередь сервера
     */
    function isRemoveSong({options, songs}: Queue): void {
        switch (options?.loop) {
            case "song": return;
            case "songs": return void songs.push(songs.shift());
            default: return void songs.shift();
        }
    }
}