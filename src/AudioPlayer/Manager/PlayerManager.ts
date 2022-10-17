import {AudioPlayer} from "../Player/AudioPlayer";
import {MessagePlayer} from "./PlayerMessages";
import {Queue} from "../Structures/Queue/Queue";

const PlayerData = {
    players: [] as AudioPlayer[], //Плееры серверов
    timer: undefined as NodeJS.Timeout, //Общий таймер
    time: -1 //Время через которое надо обновить таймер
}

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
        }, 200);
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
        }, 200);
    }

    //====================== ====================== ====================== ======================
    /**
     * @description Повтор музыки
     * @param queue {Queue} Очередь сервера
     */
    function isRemoveSong({options, songs}: Queue): void {
        switch (options?.loop) {
            case "song":
                return;
            case "songs":
                return void songs.push(songs.shift());
            default:
                return void songs.shift();
        }
    }
}

//Менеджер, добавляет в общую базу плеер или удаляет. Так-же запускает работу плеера!
export namespace PlayersManager {
    /**
     * @description Добавляем плеер в базу
     * @param player {AudioPlayer}
     * @requires {playerCycleStep}
     */
    export function toPush(player: AudioPlayer): void {
        if (PlayerData.players.includes(player)) return;
        PlayerData.players.push(player);

        //Запускаем систему
        if (PlayerData.players.length === 1) {
            PlayerData.time = Date.now();
            setImmediate(playerCycleStep);
        }
    }

    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем плеер из базы
     * @param player {AudioPlayer}
     */
    export function toRemove(player: AudioPlayer): void {
        const index = PlayerData.players.indexOf(player);
        if (index != -1) PlayerData.players.splice(index, 1);

        //Чистим систему
        if (PlayerData.players.length === 0) {
            PlayerData.time = -1;
            if (typeof PlayerData.timer !== "undefined") clearTimeout(PlayerData.timer);
        }
    }

    //====================== ====================== ====================== ======================
    /**
     * @description Цикл жизни плеера
     * @param players {AudioPlayer[]} Плееры
     */
    function playerCycleStep(players: AudioPlayer[] = null): void {
        //Проверяем плееры на возможность включить музыку в голосовые каналы
        if (players === null) {
            if (PlayerData.time === -1) return;

            PlayerData.time += 20;

            //Фильтруем какой плеер готов проигрывать музыку
            const available = PlayerData.players.filter((player) => {
                if (player.state.status === "idle") return false;

                //Если невозможно прочитать поток выдать false
                if (!player.state.stream?.hasStarted) {
                    player.state = {status: "idle"};
                    return false;
                }
                return true;
            });

            return playerCycleStep(available);
        }

        const nextPlayer = players.shift();

        //Если Array<AudioPLayer> пуст, то запрашиваем новый Array
        if (!nextPlayer) {
            if (PlayerData.time !== -1) {
                PlayerData.timer = setTimeout(playerCycleStep, PlayerData.time - Date.now());
            }
            return;
        }

        //Подготавливаем пакет с музыкой и отправляем в голосовой канал
        nextPlayer["CheckStatusPlayer"]();

        setImmediate(() => playerCycleStep(players));
    }
}