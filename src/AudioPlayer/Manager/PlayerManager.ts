import {AudioPlayer} from "../Player/AudioPlayer";
import {MessagePlayer} from "./MessagePlayer";
import {Queue} from "../Structures/Queue/Queue";

const PlayerData = {
    players: [] as AudioPlayer[],
    timer: undefined as NodeJS.Timeout,
    time: -1
}

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
                if (player.state.status === "idle" || player.state.status === "buffering") return false;

                //Если невозможно прочитать поток выдать false
                if (!player.state.stream?.readable) {
                    player.state = { status: "idle" };
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

export namespace PlayerEventsCallBacks {
    /**
     * @description Когда плеер начнет чтение потока, он возвратит эту функцию
     * @param queue {Queue} Сама очередь
     * @param seek {number} До скольки пропускает времени в треке
     * @requires {MessagePlayer}
     */
    export function onStartPlaying(queue: Queue, seek: number): void {
        const CurrentSong = queue.songs[0];
        const message = queue.channels.message;
        const {client, guild} = message;

        if (seek) queue.player.playbackDuration = seek;
        else {
            client.console(`[GuildID: ${guild.id}]: ${CurrentSong.title}`); //Отправляем лог о текущем треке
            MessagePlayer.toPlay(message); //Если стрим не пустышка отправляем сообщение
        }
    }
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

            return queue.player.play(queue); //Включаем трек
        }, 450);
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Когда плеер выдает ошибку, он возвратит эту функцию
     * @param err {Error | string} Ошибка
     * @param queue {Queue} Сама очередь
     */
    export function onErrorPlayer(err: Error | string, queue: Queue): void {
        //Выводим сообщение об ошибке
        MessagePlayer.toError(queue, queue.songs[0], err);

        queue.songs.shift();
        setTimeout(() => queue.player.play(queue), 1e3);
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Когда плеер загружает трек, он возвратит эту функцию
     * @param queue {Queue} Сама очередь
     */
    export function onBufferingPlayer(queue: Queue) {
        //Если трек не загружается через 2 сек, отправляем сообщение об этом что-бы пользователь не подумал лишнего
        setTimeout(() => {
            if (queue.player.state.status === "buffering") MessagePlayer.toBuffering(queue, queue.songs[0]);
        }, 1800)
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