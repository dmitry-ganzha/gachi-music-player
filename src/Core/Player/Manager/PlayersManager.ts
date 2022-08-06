import {AudioPlayer} from "../Audio/AudioPlayer";

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
}
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