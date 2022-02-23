import { TypedEmitter } from 'tiny-typed-emitter';
import {CurrentPlay} from "./Constructor/CurrentPlay";
import {Warning} from "./Constructor/Warning";
import {AddSong} from "./Constructor/AddSong";
//import {RunButt} from "./Constructor/Helper";
import {Queue} from "../../Manager/Queue/Structures/Queue";
import {Song} from "../../Manager/Queue/Structures/Song";
import {DiscordAPIError, ActionRow, MessageComponent, Embed} from "discord.js";
import {Channel, wMessage} from "../../../../../Core/Utils/TypesHelper";

type MessageType = "playSong" | "update" | "warning" | "push";
type Events = {
    update: (message: wMessage, need?: boolean) => Promise<void | wMessage>,
    playSong: (message: wMessage) => Promise<void | wMessage>,
    warning: (message: wMessage, song: Song, err?: Error) => Promise<void | wMessage>,
    push: (message: wMessage, song: Song) => Promise<void | wMessage>
};

export class EventMessage extends TypedEmitter<Events> {
    protected static Interval: NodeJS.Timeout = null;

    public constructor() {
        super()
        this.on('update', EventMessage.onUpdateMessage);
        this.on('playSong', EventMessage.onPlaySongMessage);
        this.on('warning', EventMessage.onWarningMessage);
        this.on('push',  EventMessage.onPushMessage);
        this.setMaxListeners(4);
    }
    /**
     * @description Обновление сообщения on_playSong
     * @param message {object} Сообщение с сервера
     * @param need {boolean} Принудительно обновляем сообщение?
     */
    protected static onUpdateMessage = async (message: wMessage, need: boolean = false): Promise<void | wMessage | null> => { //, components: [RunButt()]
        const queue: Queue = message.client.queue.get(message.guild.id);
        if (message?.embeds[0]?.fields?.length === 1 || need) return this.ErrorMessage(message.edit({ embeds: [await CurrentPlay(message, queue.songs[0], queue) as any]}).then(async (msg: any) => queue.channels.message = msg), 'update');
        return null;
    };
    /**
     * @description Показываем что играет сейчас
     * @param message {object} Сообщение с сервера
     */
    protected static onPlaySongMessage = async (message: wMessage): Promise<void | wMessage> => {
        const {client, guild, channel} = message;
        const queue: Queue = client.queue.get(guild.id);
        const exampleEmbed = await CurrentPlay(message, queue.songs[0], queue);

        if (queue.channels.message.deletable) await this.ErrorMessage(queue.channels.message.delete(), 'playSong');

        if (!queue.songs[0]?.isLive) {
            if (this.Interval) clearInterval(this.Interval);
            this.Interval = setInterval(async () => {
                const queue: Queue = client.queue.get(guild.id);

                if (!queue) return clearInterval(this.Interval);
                if (queue.player.state.status !== 'playing') return;

                return this.onUpdateMessage(queue.channels.message, true).catch(() => clearInterval(this.Interval));
            }, 12e3);
        }

        return this.AddInQueueMessage(channel, exampleEmbed, null, queue);
    };
    /**
     * @description Показываем ошибку
     * @param message {object} Сообщение с сервера
     * @param song {Song} Сама музыка
     * @param err {Error} Ошибка
     */
    protected static onWarningMessage = async (message: wMessage, song: Song, err: Error = null): Promise<void | wMessage> =>
        this.SendMessage(message.channel, await Warning(message, song, message.client.queue.get(message.guild.id), err), null, 10e3, 'warning');
    /**
     * @description Показываем что было добавлено в очередь
     * @param message {object} Сообщение с сервера
     * @param song {Song} Сама музыка
     */
    protected static onPushMessage = async ({channel, client, guild}: wMessage, song: Song): Promise<void | wMessage> =>
        this.SendMessage(channel, await AddSong(client, song, client.queue.get(guild.id)), null, 5e3, 'push');
    /**
     * @description Отправляем сообщение
     * @param channel {Channel} Текстовый канал
     * @param Embed {object} Embed
     * @param component {ActionRow} Компонент Discord.js
     * @param time {number} Время через сколько удаляем
     * @param type {string} Тип сообщения
     */
    protected static SendMessage = async (channel: Channel, Embed: Embed | object, component: ActionRow<any>, time: number = 5e3, type: MessageType): Promise<void | wMessage> =>
        this.DeleteMessage(channel.send( !component ? {embeds: [Embed]} : {embeds: [Embed]}), time, type); //, components: [component]
    /**
     * @description Удаляем сообщение со временем
     * @param send {wMessage} Сообщение
     * @param time {number} Время через сколько удаляем
     * @param type {string} Тип сообщения
     */
    protected static DeleteMessage = async (send: any, time: number = 5e3, type: MessageType): Promise<void | wMessage> =>
        this.ErrorMessage(send.then(async(msg: wMessage) => setTimeout(async() => this.ErrorMessage(msg.deletable ? msg.delete() : null, type), time)), type);
    /**
     * @description Если есть ошибка, выводим в консоль
     * @param send {object} Сообщение
     * @param type {string} Тип сообщения
     */
    protected static ErrorMessage = async (send: Promise<wMessage | any>, type: MessageType): Promise<void | wMessage> => send.catch(async (e: DiscordAPIError) =>
        console.log(`[${(new Date).toLocaleString("ru")}] [MessageEmitter]: [Method: ${e.method ?? null}]:  [on: ${type}, ${e.code}]: ${e?.message}`));
    /**
     * @description Добавляем сообщение в очередь сервера
     * @param channel {Channel} Текстовый канал
     * @param embed {MessageEmbed} Embed
     * @param component {MessageComponent} Компонент Discord.js
     * @param queue {Queue} Очередь сервера
     */
    protected static AddInQueueMessage = async (channel: Channel, embed: Embed | object, component: ActionRow<any>, {channels}: Queue): Promise<void | wMessage> =>
       this.ErrorMessage(channel.send({embeds: [embed]}).then(async (msg: any) => channels.message = msg), 'playSong'); //, components: [component]
}