import {EventEmitter} from "events";
import {CurrentPlay} from "./Constructor/CurrentPlay";
import {Warning} from "./Constructor/Warning";
import {AddSong} from "./Constructor/AddSong";
import {RunButt} from "./Constructor/Buttons";
import {Queue} from "../../Manager/Queue/Constructors/Queue";
import {Song} from "../../Manager/Queue/Constructors/Song";
import {DiscordAPIError, MessageActionRow, MessageComponent, MessageEmbed} from "discord.js";
import {W_Message} from "../../../../../Core/Utils/W_Message";

export class EventMessage extends EventEmitter {
    constructor() {
        super()
        this.on('update', this.onUpdateMessage);
        this.on('playSong', this.onPlaySongMessage);
        this.on('warning', this.onWarningMessage);
        this.on('push',  this.onPushMessage);
        this.setMaxListeners(4);
    }
    /**
     * @description Обновление сообщения on_playSong
     * @param message
     */
    private onUpdateMessage = async (message: W_Message): Promise<NodeJS.Timeout | any> => new Promise(async (res) => {
        let queue: Queue = message.client.queue.get(message.guild.id);
        if (message?.embeds[0]?.fields?.length === 1) return res(this.ErrorMessage(message.edit({ embeds: [await CurrentPlay(message, queue.songs[0], queue)], components: [RunButt()]}).then(async (msg: any) => queue.channels.message = msg), 'update', false));
        return res(null);
    });
    /**
     * @description Показываем что играет сейчас
     * @param message {object} Сообщение с сервера
     */
    private onPlaySongMessage = async (message: W_Message): Promise<any> => new Promise(async (res) => {
        const queue: Queue = message.client.queue.get(message.guild.id)
        const exampleEmbed = await CurrentPlay(message, queue.songs[0], queue);

        await this.ErrorMessage(queue.channels.message.delete(), 'playSong', true);
        return res(this.AddInQueueMessage(message, exampleEmbed, RunButt(), queue));
    });
    /**
     * @description Показываем ошибку
     * @param message {object} Сообщение с сервера
     * @param song {Song} Сама музыка
     * @param err {Error} Ошибка
     */
    private onWarningMessage = async (message: W_Message, song: Song, err: Error = null): Promise<any> => new Promise(async (res) =>
        res(this.SendMessage(message, await (async () => new Warning(message, song, message.client.queue.get(message.guild.id), err))(), null, 10e3, 'warning')));
    /**
     * @description Показываем что было добавлено в очередь
     * @param message {object} Сообщение с сервера
     * @param song {Song} Сама музыка
     */
    private onPushMessage = async (message: W_Message, song: Song): Promise<any> => new Promise(async (res) => {
        this.emit('update', message);
        return res(this.SendMessage(message, await (async () => new AddSong(message, song, message.client.queue.get(message.guild.id)))(), null, 5e3, 'push'));
    })
    /**
     * @description Отправляем сообщение
     * @param message {object} Сообщение с сервера
     * @param Embed {object} Embed
     * @param component {MessageActionRow} Компонент Discord.js
     * @param time {number} Время через сколько удаляем
     * @param type {string} Тип сообщения
     */
    private SendMessage = async (message: W_Message, Embed: MessageEmbed, component: MessageActionRow, time: number = 5e3, type: string): Promise<any> => new Promise(async (res) =>
        res(this.DeleteMessage(message.channel.send( !component ? {embeds: [Embed]} : {embeds: [Embed], components: [component]}), time, type)));
    /**
     * @description Удаляем сообщение со временем
     * @param send {object} Сообщение
     * @param time {number} Время через сколько удаляем
     * @param type {string} Тип сообщения
     */
    private DeleteMessage = async (send: any, time: number = 5e3, type: string): Promise<any> => new Promise(async (res) =>
        res(this.ErrorMessage(send.then(async (msg: W_Message) => setTimeout(async () => this.ErrorMessage(msg.delete(), type, true), time)), type, false)));
    /**
     * @description Если есть ошибка, выводим в консоль
     * @param send {object} Сообщение
     * @param type {string} Тип сообщения
     * @param del {boolean} Удалять сообщение?
     */
    private ErrorMessage = async (send: any, type: string, del: boolean): Promise<any> => send.catch(async (e: DiscordAPIError) => console.log(!del ? `[MessageEmitter]: [on: ${type}, ${e.code}]: ${e}` : `[MessageEmitter]: [Method: ${e.method}, ${e.code}]: [on: ${type}]: ${e}`));
    /**
     * @description Добавляем сообщение в очередь сервера
     * @param message {object} Сообщение с сервера
     * @param embed {object} Embed
     * @param component {MessageComponent} Компонент Discord.js
     * @param queue {object} Очередь сервера
     */
    private AddInQueueMessage = async (message: W_Message, embed: MessageEmbed, component: MessageActionRow, {channels}: Queue): Promise<any> => new Promise(async (res) => res(this.ErrorMessage(message.channel.send({embeds: [embed], components: [component]}).then(async (msg: W_Message | any) => channels.message = msg), 'playSong', false)));
}