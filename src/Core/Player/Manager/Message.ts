import {CurrentPlay} from "../Structures/Message/CurrentPlay";
import {Warning} from "../Structures/Message/Warning";
import {AddSong} from "../Structures/Message/AddSong";
import {Queue} from "../Structures/Queue/Queue";
import {Song} from "../Structures/Queue/Song";
import {MessageComponent, ActionRowBuilder} from "discord.js";
import {Button} from "../Structures/Message/Helper";
import {ClientMessage} from "../../Client";
import {Channel, EmbedConstructor} from "../../Utils/TypeHelper";

export class MessageSystem {
    protected _int: NodeJS.Timeout;

    /**
     * @description Показываем что играет сейчас
     * @param message {object} Сообщение с сервера
     */
    public PlaySongMessage = ({client, guild, channel}: ClientMessage):Promise<void | ClientMessage> | void =>{
        const queue: Queue = client.queue.get(guild.id);
        const exampleEmbed = CurrentPlay(client, queue.songs[0], queue);

        if (queue.channels.message.deletable) queue.channels.message.delete().catch((e) => console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: playSong, ${e.code}]: ${e?.message}`))

        if (!queue.songs[0]?.isLive) {
            if (this._int) clearInterval(this._int);
            this._int = setInterval(() => {
                try {
                    const queue: Queue = client.queue.get(guild.id);

                    if (!queue) return this.destroy();
                    if (queue.player.state.status !== 'playing') return;
                    if (!queue.channels.message.editable) return;

                    return UpdateMessage(queue.channels.message, true);
                } catch {
                    return this.destroy();
                }
            }, 12e3);
        }

        return AddInQueueMessage(channel, exampleEmbed, Button, queue);
    };

    public destroy = () => {
        clearInterval(this._int);
        delete this._int;
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Обновление сообщения on_playSong
 * @param message {object} Сообщение с сервера
 * @param need {boolean} Принудительно обновляем сообщение?
 */
function UpdateMessage(message: ClientMessage, need: boolean = false): Promise<void | ClientMessage> | void {
    const queue: Queue = message.client.queue.get(message.guild.id);

    if (message?.embeds[0]?.fields?.length === 1 || need) {
        const CurrentPlayEmbed = CurrentPlay(message.client, queue.songs[0], queue);

        try {
           return message.edit({embeds: [CurrentPlayEmbed]}).then((msg) => queue?.channels?.message ? queue.channels.message = msg : null);
        } catch (e) {
            return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: update, ${e.code}]: ${e?.message}`);
        }
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Показываем ошибку
 * @param message {object} Сообщение с сервера
 * @param song {Song} Сама музыка
 * @param err {Error, string} Ошибка
 */
export function WarningMessage({channel, client, guild}: ClientMessage, song: Song, err: Error | string = null): Promise<void | ClientMessage | NodeJS.Timeout> | void {
    try {
        const queue: Queue = client.queue.get(guild.id);
        const Embed = Warning(client, song, queue, err);
        const WarningChannelSend = channel.send({embeds: [Embed]});

        return DeleteMessage(WarningChannelSend, 5e3);
    } catch (e) {
        return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Показываем что было добавлено в очередь
 * @param message {object} Сообщение с сервера
 * @param song {Song} Сама музыка
 */
export function PushSongMessage({channel, client, guild}: ClientMessage, song: Song): Promise<void | ClientMessage | NodeJS.Timeout> | void {
    try {
        const queue: Queue = client.queue.get(guild.id);
        const EmbedPushedSong = AddSong(client, song, queue);
        const PushChannel = channel.send({embeds: [EmbedPushedSong]});

        return DeleteMessage(PushChannel, 5e3);
    } catch (e) {
        return console.log(`[MessageEmitter]: [Method: ${e.method ?? null}]: [on: push, ${e.code}]: ${e?.message}`);
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Удаляем сообщение со временем
 * @param send {ClientMessage} Сообщение
 * @param time {number} Время через сколько удаляем
 */
function DeleteMessage(send: Promise<ClientMessage>, time: number = 5e3): Promise<void | ClientMessage | NodeJS.Timeout> {
    return send.then((msg: ClientMessage) => setTimeout(() => msg.deletable ? msg.delete() : null, time));
}
//====================== ====================== ====================== ======================
/**
 * @description Добавляем сообщение в очередь сервера
 * @param channel {Channel} Текстовый канал
 * @param embed {MessageEmbed} Embed
 * @param component {MessageComponent} Компонент Discord.js
 * @param queue {Queue} Очередь сервера
 */
function AddInQueueMessage(channel: Channel, embed: EmbedConstructor, component: ActionRowBuilder<any>, {channels}: Queue): Promise<ClientMessage> | void  {
    try {
        return channel.send({embeds: [embed as any], components: [component]}).then((msg: any) => channels.message = msg);
    } catch (e) {
        return console.log(`[${(new Date).toLocaleString("ru")}] [MessageEmitter]: [Method: ${e.method ?? null}]: [on: playSong, ${e.code}]: ${e?.message}`);
    }
}