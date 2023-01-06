import {EmbedMessages} from "@Structures/EmbedMessages";
import {ClientMessage} from "@Client/interactionCreate";
import {AudioPlayer} from "@Structures/AudioPlayer";
import {consoleTime} from "@Client/Client";
import {Music} from "@db/Config.json";
import {Collection} from "discord.js";
import {Queue} from "@Queue/Queue";

//Настройки для плеера
const PlayerSettings = Music.AudioPlayer;
const db = { //База данных для плееров
    time: 0 as number,
    pls: [] as AudioPlayer[],
    timeout: null as NodeJS.Timer
};

//Статусы плеера при которых не надо обновлять сообщение
const PlayerStatuses = new Set(["idle", "pause", "autoPause"]);
const m_db = { //База для сообщений
    messages: new Collection<string, ClientMessage>(), //new Map сообщений, поиск осуществляется по id канала
    timeout: null as NodeJS.Timeout //Общий таймер сообщений
};
//====================== ====================== ====================== ======================
/**
 * @description Player CycleStep
 */
export namespace PlayerCycle {
    /**
     * @description Добавляем плеер в базу
     * @param player {AudioPlayer}
     * @requires {playerCycleStep}
     */
    export function toPush(player: AudioPlayer): void {
        if (db.pls.includes(player)) return;
        db.pls.push(player);

        //Запускаем систему
        if (db.pls.length === 1) {
            db.time = Date.now() + PlayerSettings.sendDuration;
            setImmediate(playerCycleStep);
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем плеер из базы
     * @param player {AudioPlayer}
     */
    export function toRemove(player: AudioPlayer): void {
        const index = db.pls.indexOf(player);
        if (index != -1) db.pls.splice(index, 1);

        //Чистим систему
        if (db.pls.length === 0) {
            if (db.timeout) clearTimeout(db.timeout);

            db.time = null;
            db.timeout = null;
        }
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Цикл жизни плеера
 */
function playerCycleStep(): void {
    db.time += 20;
    for (const player of db.pls) playerPacket(player);
    db.timeout = setTimeout(playerCycleStep, db.time - Date.now());
}
//====================== ====================== ====================== ======================
/**
 * @description Проверяем можно ли отправить пакет в голосовой канал
 * @param player {player} Плеер
 */
function playerPacket(player: AudioPlayer) {
    const state = player.state;

    //Если статус (idle или pause) прекратить выполнение функции
    if (state?.status === "pause" || state?.status === "idle" || !state?.status) return;

    if (!player.voice) {
        player.state = {...state, status: "pause"};
        return;
    } else if (state.status === "autoPause") {
        //Если стоит статус плеера (autoPause) и есть канал или каналы в которые можно воспроизвести музыку, стартуем!
        player.state = {...state, status: "read", stream: state.stream};
    }

    //Не читать пакеты при статусе плеера (autoPause)
    if (state.status === "autoPause") return;

    //Отправка музыкального пакета
    if (state.status === "read") {
        const packet: Buffer | null = state.stream?.read();

        player.sendPacket(packet);
        if (!packet) player.stop();
    }
}

/*====================== ====================== ====================== ======================*/
/*====================== ====================== ====================== ======================*/
/*====================== ====================== ====================== ======================*/

/**
 * @description Система для обновления данных сообщения
 */
export namespace MessageCycle {
    /**
     * @description Добавляем сообщение в <Message[]>
     * @param message {message} Сообщение
     * @requires {StepCycleMessage}
     */
    export function toPush(message: ClientMessage) {
        if (m_db.messages.get(message.channelId)) return; //Если сообщение уже есть в базе, то ничего не делаем
        m_db.messages.set(message.channelId, message); //Добавляем сообщение в базу

        //Если в базе есть хоть одно сообщение, то запускаем таймер
        if (m_db.messages.size === 1) setImmediate(StepCycleMessage);
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем сообщение из <Message[]>, так-же проверяем отключить ли таймер
     * @param ChannelID {string} ID канала
     * @requires {Message}
     */
    export function toRemove(ChannelID: string) {
        const Find = m_db.messages.get(ChannelID); //Ищем сообщение е базе
        if (!Find) return; //Если его нет ничего не делаем

        if (Find.deletable) Find.delete().catch(() => undefined); //Если его возможно удалить, удаляем!
        m_db.messages.delete(ChannelID); //Удаляем сообщение из базы

        //Если в базе больше нет сообщений
        if (m_db.messages.size === 0) {
            //Если таймер еще работает то удаляем его
            if (m_db.timeout) {
                clearTimeout(db.timeout);

                m_db.timeout = null;
            }
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Обновляем сообщения на текстовый каналах
     */
    function StepCycleMessage() {
        setImmediate(() => {
            try {
                setTimeout(() => m_db.messages.forEach(UpdateMessage), 1e3);
            } finally { m_db.timeout = setTimeout(StepCycleMessage, 15e3); }
        });
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Обновляем сообщение
 * @param message {ClientMessage} Сообщение
 * @requires {MessageCycle}
 */
function UpdateMessage(message: ClientMessage): void {
    const {client, guild} = message;
    const queue: Queue = client.queue.get(guild.id);

    //Если очереди нет или сообщение нельзя отредактировать, то удаляем сообщение
    if (!queue || !queue?.song || !message.editable) return MessageCycle.toRemove(message.channelId);

    //Если у плеера статус при котором нельзя обновлять сообщение
    if (PlayerStatuses.has(queue.player.state.status)) return;

    setImmediate(() => {
        const CurrentPlayEmbed = EmbedMessages.toPlay(client, queue);

        //Обновляем сообщение
        return message.edit({embeds: [CurrentPlayEmbed]}).catch((e) => {
            if (e.message === "Unknown Message") MessageCycle.toRemove(message.channelId);
            consoleTime(`[MessageEmitter]: [function: UpdateMessage]: ${e.message}`);
        });
    });
}