import {Song} from "../Queue/Song";
import {httpsClient, httpsClientOptions} from "../../../httpsClient";
import {FFmpegFormat, InputFormat, InputPlaylist, InputTrack} from "../../../Utils/TypeHelper";
import {SoundCloud, Spotify, VK, YouTube} from "../../../Platforms";
import {IncomingMessage} from "http";
import {DurationUtils} from "../../Manager/DurationUtils";
import {ClientMessage} from "../../../Client";
import {MessageCollector, MessageReaction, StageChannel, User, VoiceChannel} from "discord.js";
import {FFprobe} from "../Media/FFprobe";
import {EmbedHelper} from "../EmbedMessages";


//Типы данных
type TypeFindTrack = "track" | "playlist" | "search" | "album";
//Платформы
type TypeSearch = "yt" | "sp" | "vk" | "sc" | "ds";
//Данные которые необходимо передать для поиска
interface Options {
    type: TypeFindTrack
    platform: TypeSearch
    search: string
    message: ClientMessage
    voiceChannel: VoiceChannel | StageChannel
}


const GlobalOptions: httpsClientOptions = {request: {method: "HEAD"}};
//Все возможные запросы данных в JSON формате
const localPlatform = {
    //YouTube
    "yt": {
        "track": (search: string) => YouTube.getVideo(search),
        "playlist": (search: string) => YouTube.getPlaylist(search),
        "search": (search: string) => YouTube.SearchVideos(search)
    },
    //Spotify
    "sp": {
        "track": (search: string) => Spotify.getTrack(search),
        "playlist": (search: string) => Spotify.getPlaylist(search),
        "search": (search: string) => Spotify.SearchTracks(search),
        "album": (search: string) => Spotify.getAlbum(search)
    },
    //SoundCloud
    "sc": {
        "track": (search: string) => SoundCloud.getTrack(search),
        "playlist": (search: string) => SoundCloud.getPlaylist(search),
        "search": (search: string) => SoundCloud.SearchTracks(search),
        "album": (search: string) => SoundCloud.getPlaylist(search)
    },
    //VK
    "vk": {
        "track": (search: string) => VK.getTrack(search),
        "playlist": (search: string) => VK.getPlaylist(search),
        "search": (search: string) => VK.SearchTracks(search),
    },
    //Discord
    "ds": {
        "track": (search: string) => new FFprobe(["-i", search]).getInfo().then((trackInfo: any) => {
            //Если не найдена звуковая дорожка
            if (!trackInfo) return null;

            return {
                url: search,
                title: search.split("/").pop(),
                author: undefined,
                image: {url: EmbedHelper.NotImage},
                duration: {seconds: trackInfo.format.duration},
                format: {url: trackInfo.format.filename}
            };
        })
    }
}
/**
 * Ищет данные для плеера и проверяем работоспособность ресурса
 */
export namespace Searcher {
    /**
     * @description В зависимости от платформы и типа, делаем запрос!
     * @param options {options} Необходимые параметры
     * @requires {SearchMessage, ArrayToString}
     * @constructor
     */
    export function toPlayer(options: Options): void {
        const {platform, search, type, message, voiceChannel} = options
        // @ts-ignore
        const promise = localPlatform[platform][type](search) as Promise<InputTrack | InputPlaylist | InputTrack[]>;

        //
        promise.then((info) => {
            if (!info) return message.client.Send({text: `${message.author}, данные не были найдены!`, color: "RED", message});

            //Если пользователь делает поиск
            if (info instanceof Array) return SearchMessage(info, ArrayToString(info, message, platform), info.length, options);

            //Если это трек или плейлист
            return message.client.player.emit("play", message, voiceChannel, info);
        });
        //Если выходит ошибка
        promise.catch((err) => message.client.Send({text: `${message.author}, данные не были найдены! Error: ${err}`, color: "RED", message}));
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Ищет трек и проверяем его работоспособность
     * @requires {getFormatYouTube, CheckLink}
     */
    export function CheckHeadResource(song: Song): Promise<true | Error> {
        return new Promise(async (resolve) => {
            if (!song.format || !song.format?.url) {
                let format = await getFormatSong(song);

                if (!format || !format?.url) {
                    song.format = {url: null};
                    return resolve(new Error(`[FindResource]: [Song: ${song.title}]: Has not found format`));
                }
                //Добавляем ссылку в трек
                song.format = {url: format.url};
            }

            //Делаем head запрос на сервер
            const resource = await CheckLink(song.format?.url);
            if (resource === "Fail") { //Если выходит ошибка
                song.format.url = null;
                return resolve(new Error(`[FindResource]: [Song: ${song.title}]: Has fail checking resource link`));
            }
            return resolve(true);
        });
    }
}
//используется в Searcher.CheckHeadResource
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Проверяем ссылку
 * @param url {string} Ссылка
 * @constructor
 */
function CheckLink(url: string) {
    if (!url) return "Fail";

    return httpsClient.Request(url, GlobalOptions).then((resource: IncomingMessage) => {
        if (resource instanceof Error) return "Fail"; //Если есть ошибка
        if (resource.statusCode >= 200 && resource.statusCode < 400) return "OK"; //Если возможно скачивать ресурс
        return "Fail"; //Если прошлые варианты не подходят, то эта ссылка не рабочая
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем данные формата
 * @param song {Song} Трек
 * @requires {FindTrack, getFormatYouTube}
 */
function getFormatSong({type, url, title, author, duration}: Song): Promise<InputFormat | FFmpegFormat> {
    try {
        switch (type) {
            case "SPOTIFY": return FindTrack(`${author.title} - ${title}`, duration.seconds);
            case "SOUNDCLOUD": return SoundCloud.getTrack(url).then((d) => d?.format);
            case "VK": return VK.getTrack(url).then((d) => d?.format);
            case "YOUTUBE": return getFormatYouTube(url);
            default: return null
        }
    } catch {
        console.log("[FindResource]: Fail to found format");
        return null;
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Ищем трек на youtube
 * @param nameSong {string} Название музыки
 * @param duration
 * @requires {getFormatYouTube}
 * @constructor
 */
function FindTrack(nameSong: string, duration: number): Promise<InputFormat> {
    return YouTube.SearchVideos(nameSong, {limit: 5}).then((Tracks) => {
        //Фильтруем треки оп времени
        const FindTracks = Tracks.filter((track) => Filter(track, duration));

        //Если треков нет
        if (FindTracks.length === 0) return null;

        //Получаем данные о треке
        return getFormatYouTube(FindTracks[0].url);
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Получаем от видео аудио формат
 * @param url {string} Ссылка
 */
function getFormatYouTube(url: string): Promise<InputFormat> {
    return YouTube.getVideo(url, {onlyFormats: true}) as Promise<InputFormat>;
}

function Filter(track: InputTrack, NeedDuration: number) {
    const DurationSong = DurationUtils.ParsingTimeToNumber(track.duration.seconds);

    //Как надо фильтровать треки
    return DurationSong === NeedDuration || DurationSong < NeedDuration + 10 && DurationSong > NeedDuration - 10;
}

//используется в Searcher.toPlayer
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
/**
 * @description Отправляем сообщение о том что удалось найти
 * @param results {any[]} Результаты поиска
 * @param resp {string} Строка со всеми треками
 * @param num {number} Кол-во найденных треков
 * @param options {Options}
 * @requires {Reaction, CreateMessageCollector, deleteMessage, Searcher}
 * @constructor
 */
function SearchMessage(results: any[], resp: string, num: number, options: Options): void {
    const {message, platform} = options;

    setImmediate(() => {
        if (results.length < 1) return message.client.Send({text: `${message.author} | Я не смог найти музыку с таким названием. Попробуй другое название!`, message, color: "RED"});

        const ConstFind = `Выбери от 1 до ${results.length}`; //Показываем сколько есть треков в списке
        const Requester = `[Платформа: ${platform} | Запросил: ${message.author.username}]`; //Показываем платформу и того кто запросил

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
function Reaction(msg: ClientMessage | any, message: ClientMessage, emoji: string, callback: any): void {
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
function CreateMessageCollector(msg: ClientMessage, message: ClientMessage, num: any): MessageCollector {
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
            const Duration = type === "yt" ? track.duration.seconds : DurationUtils.ParsingTimeToString(parseInt(track.duration.seconds)); //Проверяем надо ли конвертировать время
            const NameTrack = `[${message.client.ConvertedText(track.title, 80, true)}]`; //Название трека
            const DurationTrack = `[${Duration ?? "LIVE"}]`; //Длительность трека
            const AuthorTrack = `[${message.client.ConvertedText(track.author.title, 12, true)}]`; //Автор трека

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