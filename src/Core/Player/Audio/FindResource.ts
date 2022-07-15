import {Song} from "../Structures/Queue/Song";
import {httpsClient, httpsClientOptions} from "../../httpsClient";
import {FFmpegFormat, InputFormat, InputPlaylist, InputTrack} from "../../Utils/TypeHelper";
import {SoundCloud, Spotify, VK, YouTube} from "../../Platforms";
import {IncomingMessage} from "http";
import {DurationUtils} from "../Manager/DurationUtils";
import ParsingTimeToNumber = DurationUtils.ParsingTimeToNumber;
import {ClientMessage} from "../../Client";
import {MessageCollector, MessageReaction, StageChannel, User, VoiceChannel} from "discord.js";
import ParsingTimeToString = DurationUtils.ParsingTimeToString;
import {FFprobe} from "../Structures/Media/FFprobe";
import {EmbedHelper} from "../Structures/EmbedMessages";

const GlobalOptions: httpsClientOptions = {request: {method: "HEAD"}};

//====================== ====================== ====================== ======================
/**
 * @description Заготавливаем необходимые данные для создания потока
 */
export function FindResourceInfo(song: Song): Promise<true | Error> {
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
 * @constructor
 */
function FindTrack(nameSong: string, duration: number): Promise<InputFormat> {
    return YouTube.SearchVideos(nameSong, {limit: 30}).then((Tracks) => {
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
    const DurationSong = ParsingTimeToNumber(track.duration.seconds);

    //Как надо фильтровать треки
    return DurationSong === NeedDuration || DurationSong < NeedDuration + 10 && DurationSong > NeedDuration - 10;
}


//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================
//====================== ================FindTrackInfo================ ======================
//====================== ====================== ====================== ======================
//====================== ====================== ====================== ======================

//Типы данных
type TypeFindTrack = "track" | "playlist" | "search" | "album" | "change";
//Платформы
type TypeSearch = "YouTube" | "Spotify" | "VK" | "SoundCloud" | "Discord";
//Как выглядят данные
interface Types {
    platform: TypeSearch;
    typeSong: TypeFindTrack;
}

/**
 * Все доступные запросы на поиск данных на разных платформах
 */
export namespace FindTrackInfo {
    /**
     * @description Делаем поиск на YouTube
     * @param type {TypeFindTrack} Тип запроса
     * @param search {string} Что ищем
     * @param message {ClientMessage} Сообщение пользователя
     * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
     */
    export function getYouTube(type: TypeFindTrack, search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) {
        const types: Types = {platform: "YouTube", typeSong: type};
        switch (type) {
            //Если search === https://www.youtube.com/watch?v=ID
            case "track": {
                setImmediate(() => {
                    YouTube.getVideo(search).then((video: InputTrack) => AutoCompileData(video, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
            //Если search === https://www.youtube.com/playlist?list=ID
            case "playlist": {
                setImmediate(() => {
                    YouTube.getPlaylist(search).then((playlist: InputPlaylist) => AutoCompileData(playlist, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
            //Если search === string
            case "search": {
                setImmediate(() => {
                    YouTube.SearchVideos(search).then((result: InputTrack[]) => AutoCompileDataSearch(result, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
            //Если search === track && search === playlist
            case "change": {
                const FindString = "Я обнаружил в этой ссылке, видео и плейлист. Что включить\n\n1️⃣ - Включить плейлист\n2️⃣ - Включить видео";
                message.channel.send(`\`\`\`css\n${FindString}\`\`\``).then((msg: ClientMessage) => {
                    setImmediate(() => {
                        Reaction(msg, message, "1️⃣", () => {
                            deleteMessage(msg as any);
                            return getYouTube("playlist", search, message, voiceChannel);
                        });
                        Reaction(msg, message, "2️⃣", () => {
                            deleteMessage(msg as any);
                            return getYouTube("track", search, message, voiceChannel);
                        });

                        setTimeout(() => {
                            [msg, message].forEach(m => deleteMessage(m));
                        }, 10e3);
                    });
                });
            }
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Делаем поиск в Spotify
     * @param type {TypeFindTrack} Тип запроса
     * @param search {string} Что ищем
     * @param message {ClientMessage} Сообщение пользователя
     * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
     */
    export function getSpotify(type: TypeFindTrack, search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) {
        const types: Types = {platform: "Spotify", typeSong: type};
        switch (type) {
            //Если search === https://open.spotify.com/track/ID
            case "track": {
                setImmediate(() => {
                    Spotify.getTrack(search).then((track) => AutoCompileData(track, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
            case "album": //Если search === https://open.spotify.com/album/ID
            case "playlist": { //Если search === https://open.spotify.com/playlist/ID
                setImmediate(() => {
                    Spotify.getPlaylist(search).then((playlist) => AutoCompileData(playlist, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
            //Если search === string
            case "search": {
                setImmediate(() => {
                    Spotify.SearchTracks(search).then((result) => AutoCompileDataSearch(result, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Делаем поиск в VK
     * @param type {TypeFindTrack} Тип запроса
     * @param search {string} Что ищем
     * @param message {ClientMessage} Сообщение пользователя
     * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
     */
    export function getVk(type: TypeFindTrack, search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) {
        const types: Types = {platform: "VK", typeSong: type};
        switch (type) {
            //Если search === https://vk.com/audioUserID_TrackID
            case "track": {
                setImmediate(() => {
                    VK.getTrack(search).then((track) => AutoCompileData(track, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
            //Если search === https://vk.com/music/playlist/keyID_TrackLenght_PlaylistID
            case "playlist": {
                setImmediate(() => {
                    VK.getPlaylist(search).then((playlist) => AutoCompileData(playlist, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
            //Если search === string
            case "search": {
                setImmediate(() => {
                    VK.SearchTracks(search).then((result) => AutoCompileDataSearch(result, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Делаем поиск в SoundCloud
     * @param type {TypeFindTrack} Тип запроса
     * @param search {string} Что ищем
     * @param message {ClientMessage} Сообщение пользователя
     * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
     */
    export function getSoundCloud(type: TypeFindTrack, search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) {
        const types: Types = {platform: "SoundCloud", typeSong: type};
        switch (type) {
            //Если search === https://soundcloud.com/AuthorName/TrackName
            case "track": {
                setImmediate(() => {
                    SoundCloud.getTrack(search).then((video: InputTrack) => AutoCompileData(video, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
            //Если search === https://soundcloud.com/AuthorName/sets/AlbumName
            case "album":
            case "playlist": {
                setImmediate(() => {
                    SoundCloud.getPlaylist(search).then((playlist: InputPlaylist) => AutoCompileData(playlist, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
            //Если search === string
            case "search": {
                setImmediate(() => {
                    SoundCloud.SearchTracks(search).then((result: InputTrack[]) => AutoCompileDataSearch(result, message, voiceChannel, types))
                        .catch((err) => AutoCatch(err, message, types.platform));
                });
                return;
            }
        }
    }
    //====================== ====================== ====================== ======================
    /**
     * @description Делаем поиск в Discord
     * @param type {TypeFindTrack} Тип запроса
     * @param search {string} Что ищем
     * @param message {ClientMessage} Сообщение пользователя
     * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
     */
    export function getDiscord(type: TypeFindTrack, search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) {
        setImmediate(() => {
            const attachment = message.attachments.last();
            if (attachment) search = attachment.url;

            //Проверяем файл, есть ли в нем аудио дорожка
            new FFprobe(["-i", search]).getInfo().then((trackInfo: any) => {
                if (!trackInfo) return sendMessage(message, `${message.author}, я не нахожу в этом файле звуковую дорожку!`);

                const TrackData: InputTrack = {
                    url: search,
                    title: search.split("/").pop(),
                    author: {
                        url: `https://discordapp.com/users/${message.author.id}`,
                        title: message.author.username,
                        isVerified: false,
                        image: { url: message.author.avatarURL() }
                    },
                    image: { url: EmbedHelper.NotImage },
                    duration: { seconds: trackInfo.format.duration },
                    format: { url: trackInfo.format.filename }
                };

                return AutoCompileData(TrackData, message, voiceChannel, {platform: "Discord", typeSong: type});
            });
        });
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Сокращение функций FindTrackInfo<all> для уменьшения кода без потерь по качеству
 * @param info {InputTrack | InputPlaylist} Трек или плейлист
 * @param message {ClientMessage} Сообщение пользователя
 * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
 * @param types {Types} Тип данных и платформа
 * @constructor
 */
function AutoCompileData(info: InputTrack | InputPlaylist, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel, types: Types) {
    if (!info) return sendMessage(message, `${message.author}, **${types.platform}** не хочет делится данными! Существует ли **${types.typeSong}** вообще!`);
    return message.client.player.emit("play", message, voiceChannel, info)
}
//====================== ====================== ====================== ======================
/**
 * @description Сокращение функций FindTrackInfo<all> для уменьшения кода без потерь по качеству
 * @param info {InputTrack[] | {items: InputTrack[]}} Array<InputTrack> или items.Array<InputTrack>
 * @param message {ClientMessage} Сообщение пользователя
 * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
 * @param types {Types} Тип данных и платформа
 * @constructor
 */
function AutoCompileDataSearch(info: InputTrack[] | {items: InputTrack[]} , message: ClientMessage, voiceChannel: VoiceChannel | StageChannel, types: {platform: TypeSearch}) {
    if ("items" in info) {
        if (!info || !info.items) return sendMessage(message, `${message.author}, я нечего не нашел в **${types.platform}**`);

        return SearchSendMessage(message, info.items, voiceChannel, ArraySort(info.items, message, types.platform), info.items.length, types.platform);
    } else {
        if (!info) return sendMessage(message, `${message.author}, я нечего не нашел в **${types.platform}**`);

        return SearchSendMessage(message, info, voiceChannel, ArraySort(info, message, types.platform), info.length, types.platform);
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Сокращение функций FindTrackInfo<all> для уменьшения кода без потерь по качеству
 * @param err {Error} Ошибка
 * @param message {ClientMessage} Сообщение пользователя
 * @param platform {TypeSearch} Платформа где ищем данные
 * @constructor
 */
function AutoCatch(err: Error, message: ClientMessage, platform: string) {
    console.log(err);
    return sendMessage(message, `${message.author}, **${platform}** не хочет делится данными! Произошла ошибка!`);
}
//====================== ====================== ====================== ======================
/**
 * @description Просто отправляем сообщение
 * @param message {ClientMessage} Сообщение пользователя
 * @param text {string} Что надо написать
 */
function sendMessage(message: ClientMessage, text: string): void {
    message.client.Send({text, color: "RED", message});
}

//Все нижние функции для поиска треков (Reaction)
//====================== ====================== ====================== ======================
/**
 * @description Собираем найденные треки в <string>
 * @param results {any[]} Результаты поиска
 * @param message {ClientMessage} Сообщение
 * @param type {TypeSearch} Платформа на которой искали
 * @constructor
 */
function ArraySort(results: InputTrack[], message: ClientMessage, type: TypeSearch): string {
    let NumberTrack = 1, StringTracks;

    // @ts-ignore
    results.ArraySort(15).forEach((tracks: InputTrack[]) => {
        StringTracks = tracks.map((track) => {
            const NameTrack = `[${message.client.ConvertedText(track.title, 80, true)}]`;
            const DurationTrack = `[${ConvertTimeSearch(track.duration.seconds, type) ?? "LIVE"}]`;
            const AuthorTrack = `[${message.client.ConvertedText(track.author.title, 12, true)}]`;

            return `${NumberTrack++} ➜ ${DurationTrack} | ${AuthorTrack} | ${NameTrack}`;
        }).join("\n");
    });
    return StringTracks;
}
//====================== ====================== ====================== ======================
/**
 * @description Отправляем сообщение о том что удалось найти
 * @param message {ClientMessage} Сообщение
 * @param results {any[]} Результаты поиска
 * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
 * @param resp {string} Строка со всеми треками
 * @param num {number} Кол-во найденных треков
 * @param type {TypeSearch} Платформа на которой искали
 * @constructor
 */
function SearchSendMessage(message: ClientMessage, results: any[], voiceChannel: VoiceChannel | StageChannel, resp: string, num: number, type: TypeSearch): void {
    setImmediate(() => {
        if (results.length < 1) return message.client.Send({text: `${message.author} | Я не смог найти музыку с таким названием. Попробуй другое название!`, message, color: "RED"});
        const ConstFind = `Выбери от 1 до ${results.length}`;
        const PltReq = `[Платформа: ${type} | Запросил: ${message.author}]`;

        message.channel.send(`\`\`\`css\n${ConstFind}\n${PltReq}\n\n${resp}\`\`\``).then((msg: ClientMessage) => {
            const collector = CreateMessageCollector(msg, message, num);

            Reaction(msg, message, "❌", () => {
                deleteMessage(msg);
                collector?.stop();
            });

            return CollectorCollect(msg, results, message, voiceChannel, collector, type);
        });
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Добавляем к коллектору ивент сбора
 * @param msg {ClientMessage} Сообщение, бота
 * @param results {any[]} Результаты поиска
 * @param message {ClientMessage} Сообщение, пользователя
 * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
 * @param collector {MessageCollector} Коллектор
 * @param type {TypeSearch} Платформа на которой искали
 * @constructor
 */
function CollectorCollect(msg: ClientMessage, results: any[], message: ClientMessage, voiceChannel: VoiceChannel | StageChannel, collector: MessageCollector, type: TypeSearch): void {
    //Что будет делать сборщик после нахождения числа
    collector.once("collect", (m: any): void => {
        setImmediate(() => {
            [msg, m].forEach((m: ClientMessage) => deleteMessage(m)); //Удаляем сообщения
            collector?.stop(); //Уничтожаем сборщик
            return pushSong(results, m, message, voiceChannel, type); //Добавим выбранный трек в очередь
        });
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Из типа платформа делает запрос на получение данных о треке
 * @param results {any[]} Результаты поиска
 * @param m {ClientMessage} Сообщение, бота
 * @param message {ClientMessage} Сообщение, пользователя
 * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
 * @param type {TypeSearch} Платформа на которой искали
 */
function pushSong(results: any[], m: ClientMessage, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel, type: TypeSearch): void {
    setImmediate(() => {
        const url = results[parseInt(m.content) - 1].url;

        //Добавляем трек с зависимостью платформы
        switch (type) {
            case "Spotify": return FindTrackInfo.getSpotify("track", url, message, voiceChannel);
            case "VK": return FindTrackInfo.getVk("track", url, message, voiceChannel);
            case "SoundCloud": return FindTrackInfo.getSoundCloud("track", url, message, voiceChannel);
            default: return FindTrackInfo.getYouTube("track", url, message, voiceChannel);
        }
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Удаляем сообщение
 * @param msg {ClientMessage} Сообщение которое надо удалить
 */
function deleteMessage(msg: ClientMessage): void {
    setTimeout(() => msg.delete().catch(() => null), 1e3);
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
 * @description Конвертируем время в 00:00
 * @param duration {string} Время трека
 * @param type {TypeSearch} Платформа на которой искали
 * @constructor
 */
function ConvertTimeSearch(duration: string, type: TypeSearch) {
    if (type === "YouTube") return duration;
    return ParsingTimeToString(parseInt(duration));
}