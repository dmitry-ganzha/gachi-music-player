import {CurrentPlay} from "./Constructor/CurrentPlay";
import {Warning} from "./Constructor/Warning";
import {AddSong} from "./Constructor/AddSong";
import {Queue} from "../../Manager/Queue/Structures/Queue";
import {Song} from "../../Manager/Queue/Structures/Song";
import {MessageComponent, ActionRowBuilder} from "discord.js";
import {EmbedConstructor, wMessage} from "../../../../../Core/Utils/TypesHelper";
import {Button} from "./Constructor/Helper";

export class MessageSystem {
    protected _int: NodeJS.Timeout;

    /**
     * @description Показываем что играет сейчас
     * @param message {object} Сообщение с сервера
     */
    public PlaySongMessage = async ({client, guild, channel}: wMessage): Promise<void | wMessage> =>{
        const queue: Queue = client.queue.get(guild.id);
        const exampleEmbed = await CurrentPlay(client, queue.songs[0], queue);

        if (queue.channels.message.deletable) queue.channels.message.delete().catch((e) => console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: playSong, ${e.code}]: ${e?.message}`))

        if (!queue.songs[0]?.isLive) {
            if (this._int) clearInterval(this._int);
            this._int = setInterval(async () => {
                try {
                    const queue: Queue = client.queue.get(guild.id);

                    if (!queue) return clearInterval(this._int);
                    if (queue.player.state.status !== 'playing') return;

                    return UpdateMessage(queue.channels.message, true).catch(() => clearInterval(this._int));
                } catch {
                    return clearInterval(this._int)
                }
            }, 12e3);
        }

        return AddInQueueMessage(channel, exampleEmbed, Button, queue);
    };

    public destroy = () => {
        clearInterval(this._int);
        delete this._int;
    }
}

/**
 * @description Обновление сообщения on_playSong
 * @param message {object} Сообщение с сервера
 * @param need {boolean} Принудительно обновляем сообщение?
 */
async function UpdateMessage(message: wMessage, need: boolean = false): Promise<void | wMessage | null> {
    const queue: Queue = message.client.queue.get(message.guild.id);
    if (message?.embeds[0]?.fields?.length === 1 || need) {
        const CurrentPlayEmbed = await CurrentPlay(message.client, queue.songs[0], queue);

        try {
           return message.edit({embeds: [CurrentPlayEmbed]}).then(async (msg: any) => queue.channels.message = msg);
        } catch (e) {
            return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: update, ${e.code}]: ${e?.message}`);
        }
    }
}

/**
 * @description Показываем ошибку
 * @param message {object} Сообщение с сервера
 * @param song {Song} Сама музыка
 * @param err {Error} Ошибка
 */
export async function WarningMessage({channel, client, guild}: wMessage, song: Song, err: Error = null): Promise<void | wMessage> {
    try {
        const queue: Queue = client.queue.get(guild.id);
        const Embed = await Warning(client, song, queue, err);
        const WarningChannelSend = channel.send({embeds: [Embed]});

        return DeleteMessage(WarningChannelSend, 5e3);
    } catch (e) {
        return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`)
    }
}

/**
 * @description Показываем что было добавлено в очередь
 * @param message {object} Сообщение с сервера
 * @param song {Song} Сама музыка
 */
export async function PushSongMessage({channel, client, guild}: wMessage, song: Song): Promise<void | wMessage> {
    try {
        const queue: Queue = client.queue.get(guild.id);
        const EmbedPushedSong = await AddSong(client, song, queue);
        const PushChannel = channel.send({embeds: [EmbedPushedSong]});

        return DeleteMessage(PushChannel, 5e3);
    } catch (e) {
        return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`)
    }
}

/**
 * @description Удаляем сообщение со временем
 * @param send {wMessage} Сообщение
 * @param time {number} Время через сколько удаляем
 */
async function DeleteMessage(send: any, time: number = 5e3): Promise<void | wMessage> {
    return send.then(async (msg: wMessage) => setTimeout(async () => msg.deletable ? msg.delete() : null, time));
}

/**
 * @description Добавляем сообщение в очередь сервера
 * @param channel {wMessage["channel"]} Текстовый канал
 * @param embed {MessageEmbed} Embed
 * @param component {MessageComponent} Компонент Discord.js
 * @param queue {Queue} Очередь сервера
 */
async function AddInQueueMessage(channel: wMessage["channel"], embed: EmbedConstructor, component: ActionRowBuilder<any>, {channels}: Queue): Promise<void | wMessage>  {
    try {
        return channel.send({embeds: [embed as any], components: [component]}).then(async (msg: any) => channels.message = msg);
    } catch (e) {
        return console.log(`[${(new Date).toLocaleString("ru")}] [MessageEmitter]: [Method: ${e.method ?? null}]: [on: playSong, ${e.code}]: ${e?.message}`);
    }
}