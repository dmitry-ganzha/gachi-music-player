import {MessageCollector, MessageReaction, StageChannel, User, VoiceChannel} from "discord.js";
import {DurationUtils} from "../Manager/DurationUtils";
import {ClientMessage} from "../../Handler/Events/Activity/Message";
import {InputPlaylist, InputTrack, SupportPlatforms} from "../Structures/Queue/Song";

const youtubeStr = /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi;
const spotifySrt = /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi;
const SoundCloudSrt = /^(?:(https?):\/\/)?(?:(?:www|m)\.)?(api\.soundcloud\.com|soundcloud\.com|snd\.sc)\/(.*)$/;
const UrlSrt = /^(https?:\/\/)/gi;

export namespace Searcher {
    /**
     * @description Ищем и передаем в плеер данные
     * @param options {Options} Параметры
     */
    export function toPlayer(options: Options): void {
        const {search, message, voiceChannel} = options;
        const type: TypeFindTrack = toPlayerUtils.typeSong(search);
        const platform: TypeSearch = toPlayerUtils.PlatformSong(search, message);

        //Отправляем сообщение о поиске трека
        if (!message.attachments?.last()?.url) message.client.sendMessage({ text: `Поиск 🔍 | ${search}`, message, color: "YELLOW", type: "css" });

        const findPlatform = SupportPlatforms[platform];
        const findCallback = (findPlatform as any)[type];

        //Если нет в базе платформы
        if (!findPlatform) return message.client.sendMessage({text: `${message.author}, у меня нет поддержки такой платформы!`, color: "RED", message});
        //Если есть платформа, но нет callbacks в платформе
        else if (!findCallback) return message.client.sendMessage({text: `${message.author}, у меня нет поддержки этого типа запроса!`, color: "RED", message});

        const newSearch = type === "search" && search?.match(platform) ? search.split(platform)[1] : search;
        const runPromise = findCallback(newSearch) as Promise<InputTrack | InputPlaylist | InputTrack[]>;

        runPromise.then((info: InputTrack | InputPlaylist | InputTrack[]) => {
            if (!info) return message.client.sendMessage({text: `${message.author}, данные не были найдены!`, color: "YELLOW", message});

            //Если пользователь ищет трек
            if (info instanceof Array) return SearchSongMessage.toSend(info, info.length, {...options, platform, type});

            //Сообщаем что трек был найден
            if (type !== "playlist") message.client.sendMessage({ text: `Найден 🔍 | ${type} | ${info.title}`, message, color: "YELLOW", type: "css" });

            //Загружаем трек или плейлист в GuildQueue
            return message.client.player.emit("play", message, voiceChannel, info);
        });
        //Если выходит ошибка
        runPromise.catch((err) => message.client.sendMessage({text: `${message.author}, данные не были найдены! \nError: ${err}`, color: "RED", message}));
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Функции для Searcher<toPlayer>
 */
namespace toPlayerUtils {
    /**
     * @description Независимо от платформы делаем проверку типа ссылки
     * @param search {string} Что там написал пользователь
     * @private
     */
    export function typeSong(search: string) {
        if (!search) return "track"; //Если нет search, значит пользователь прикрепил файл

        if (search.match(/playlist/)) return "playlist";
        else if (search.match(/album/) || search.match(/sets/)) return "album";
        else if (search.match(UrlSrt)) return "track";
        return "search";
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем инициалы платформы
     * @param search {string} Что там написал пользователь
     * @param message {ClientMessage} Сообщение
     * @private
     */
    export function PlatformSong(search: string, message: ClientMessage): TypeSearch {
        if (!search) return "Discord"; //Если нет search, значит пользователь прикрепил файл

        if (search.match(UrlSrt)) {
            if (search.match(youtubeStr)) return "YOUTUBE";
            else if (search.match(spotifySrt)) return "SPOTIFY";
            else if (search.match(/vk.com/)) return "VK";
            else if (search.match(SoundCloudSrt)) return "SOUNDCLOUD";
            else if (search.match(/cdn.discordapp.com/) || message.attachments?.last()?.url) return "Discord";
        }

        const SplitSearch = search.split(' ');
        const FindType = SplitSearch[0].toLowerCase() as TypeSearch;

        if (FindType.length > 2) return "YOUTUBE";
        return FindType;
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Сообщение о поиске треков
 */
namespace SearchSongMessage {
    /**
     * @description Отправляем сообщение о том что удалось найти
     * @param results {any[]} Результаты поиска
     * @param num {number} Кол-во найденных треков
     * @param options {Options}
     * @requires {Reaction, CreateMessageCollector, deleteMessage, Searcher}
     * @constructor
     */
    export function toSend(results: InputTrack[], num: number, options: Options): void {
        const {message, platform} = options;

        setImmediate(() => {
            if (results.length < 1) return message.client.sendMessage({text: `${message.author} | Я не смог найти музыку с таким названием. Попробуй другое название!`, message, color: "RED"});

            const ConstFind = `Выбери от 1 до ${results.length}`; //Показываем сколько есть треков в списке
            const Requester = `[Платформа: ${platform} | Запросил: ${message.author.username}]`; //Показываем платформу и того кто запросил
            const resp = ArrayToString(results, message, platform)

            //Отправляем сообщение
            message.channel.send(`\`\`\`css\n${ConstFind}\n${Requester}\n\n${resp}\`\`\``).then((msg: ClientMessage) => {
                //Создаем сборщик
                const collector = CreateMessageCollector(msg, message, num);

                //Делаем что-бы при нажатии на эмодзи удалялся сборщик
                Reaction(msg, message, "❌", () => {
                    deleteMessage(msg); //Удаляем сообщение
                    collector?.stop();
                });

                //Что будет делать сборщик после нахождения числа
                collector.once("collect", (m: any): void => {
                    setImmediate(() => {
                        [msg, m].forEach((m: ClientMessage) => deleteMessage(m)); //Удаляем сообщения, бота и пользователя
                        collector?.stop(); //Уничтожаем сборщик

                        //Получаем ссылку на трек, затем включаем его
                        const url = results[parseInt(m.content) - 1].url;
                        return Searcher.toPlayer({...options, type: "track", search: url})
                    });
                });

                return;
            });
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description добавляем под сообщение эмодзи
     * @param msg {ClientMessage} Сообщение, бота
     * @param message {ClientMessage} Сообщение, пользователя
     * @param emoji {string} сам эмодзи
     * @param callback {Function} Что будет происходить при нажатии на эмодзи
     * @constructor
     */
    function Reaction(msg: ClientMessage, message: ClientMessage, emoji: string, callback: Function): void {
        setImmediate(() => {
            //Добавляем реакцию под сообщением
            msg.react(emoji).then(() => {
                const collector = msg.createReactionCollector({
                    filter: (reaction: MessageReaction, user: User) => (reaction.emoji.name === emoji && user.id !== message.client.user.id),
                    max: 1,
                    time: 60e3 //Через 1 мин сборщик не будет работать
                });
                //Что будет делать сборщик после нажатия на реакцию
                collector.once("collect", () => {
                    collector?.stop();
                    return callback();
                });
            });
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем коллектор (discord.js) для обработки сообщений от пользователя
     * @param msg {ClientMessage} Сообщение, бота
     * @param message {ClientMessage} Сообщение, пользователя
     * @param num {number} Кол-во треков
     * @constructor
     */
    function CreateMessageCollector(msg: ClientMessage, message: ClientMessage, num: number): MessageCollector {
        //Сборщик чисел, отправленных пользователем
        return msg.channel.createMessageCollector({
            filter: (m: any) => !isNaN(m.content) && m.content <= num && m.content > 0 && m.author.id === message.author.id,
            max: 1,
            time: 60e3 //Через 1 мин сборщик не будет работать
        });
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Собираем найденные треки в <string>
     * @param results {any[]} Результаты поиска
     * @param message {ClientMessage} Сообщение
     * @param type {TypeSearch} Платформа на которой искали
     * @requires {ParsingTimeToString}
     * @constructor
     */
    function ArrayToString(results: InputTrack[], message: ClientMessage, type: TypeSearch): string {
        let NumberTrack = 1, StringTracks;

        // @ts-ignore
        results.ArraySort(15).forEach((tracks: InputTrack[]) => {
            StringTracks = tracks.map((track) => {
                const Duration = type === "YOUTUBE" ? track.duration.seconds : DurationUtils.ParsingTimeToString(parseInt(track.duration.seconds)); //Проверяем надо ли конвертировать время
                const NameTrack = `[${message.client.replaceText(track.title, 80, true)}]`; //Название трека
                const DurationTrack = `[${Duration ?? "LIVE"}]`; //Длительность трека
                const AuthorTrack = `[${message.client.replaceText(track.author.title, 12, true)}]`; //Автор трека

                return `${NumberTrack++} ➜ ${DurationTrack} | ${AuthorTrack} | ${NameTrack}`;
            }).join("\n");
        });
        return StringTracks;
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем сообщение
     * @param msg {ClientMessage} Сообщение которое надо удалить
     */
    function deleteMessage(msg: ClientMessage): void {
        setTimeout(() => msg.delete().catch(() => null), 1e3);
    }
}

//Типы данных
type TypeFindTrack = "track" | "playlist" | "search" | "album";
//Платформы
type TypeSearch = "YOUTUBE" | "SPOTIFY" | "VK" | "SOUNDCLOUD" | "Discord";
//Данные которые необходимо передать для поиска
interface Options {
    type?: TypeFindTrack
    platform?: TypeSearch
    search: string
    message: ClientMessage
    voiceChannel: VoiceChannel | StageChannel
}