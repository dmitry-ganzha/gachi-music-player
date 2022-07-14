import {AudioPlayer} from "../Audio/AudioPlayer";

const audioPlayers: AudioPlayer[] = []; //База с плеерами
let AudioCycleTimer: NodeJS.Timeout | undefined;
let TimeToFrame = -1;

//====================== ====================== ====================== ======================
/**
 * @description Добавляем плеер в базу
 * @param player {AudioPlayer}
 */
export function addAudioPlayer(player: AudioPlayer): void {
    if (audioPlayers.includes(player)) return;
    audioPlayers.push(player);

    //Запускаем систему
    if (audioPlayers.length === 1) {
        TimeToFrame = Date.now();
        setImmediate(playerCycleStep);
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Удаляем плеер из базы
 * @param player {AudioPlayer}
 */
export function deleteAudioPlayer(player: AudioPlayer): void {
    const index = audioPlayers.indexOf(player);
    if (index != -1) audioPlayers.splice(index, 1);

    //Чистим систему
    if (audioPlayers.length === 0) {
        TimeToFrame = -1;
        if (typeof AudioCycleTimer !== "undefined") clearTimeout(AudioCycleTimer);
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
        if (TimeToFrame === -1) return;

        TimeToFrame += 20;

        //Фильтруем какой плеер готов проигрывать музыку
        const available = audioPlayers.filter((player) => player.checkPlayable);
        return playerCycleStep(available);
    }

    const nextPlayer = players.shift();

    //Если Array<AudioPLayer> пуст, то запрашиваем новый Array
    if (!nextPlayer) {
        if (TimeToFrame !== -1) {
            AudioCycleTimer = setTimeout(playerCycleStep, TimeToFrame - Date.now());
        }
        return;
    }

    //Подготавливаем пакет с музыкой и отправляем в голосовой канал
    nextPlayer["CheckStatusPlayer"]();

    setImmediate(() => playerCycleStep(players));
}