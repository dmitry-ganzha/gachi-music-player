import {Command} from "../Constructor";
import {
    ApplicationCommandOptionType,
    MessageCollector,
    MessageReaction,
    StageChannel,
    User,
    VoiceChannel
} from "discord.js";
import {ClientMessage} from "../../Core/Client";
import {SoundCloud, Spotify, VK, YouTube} from "../../Core/Platforms";
import {Queue} from "../../Core/Player/Structures/Queue/Queue";
import {InputPlaylist, InputTrack} from "../../Core/Utils/TypeHelper";
import {NotImage} from "../../Core/Player/Structures/Message/Helper";
import {ParseTimeString} from "../../Core/Player/Manager/DurationUtils";
import {FFprobe} from "../../Core/Player/Structures/Media/FFprobe";

const youtubeStr = /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi;
const spotifySrt = /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi;
const SoundCloudSrt = /^(?:(https?):\/\/)?(?:(?:www|m)\.)?(api\.soundcloud\.com|soundcloud\.com|snd\.sc)\/(.*)$/;

type TypeSearch = "yt" | "sp" | "vk" | "sc";

/**
 * @description Функции плеера
 */
const PlayerSys = {
    /**
     * @description Отправляем трек в плеер для дальнейшей обработки
     * @param video {InputTrack} Данные трека, видео
     * @param message {ClientMessage} Сообщение
     * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
     * @constructor
     */
    Default: (video: InputTrack, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => void message.client.player.emit("play", message, voiceChannel, video),
    /**
     * @description Отправляем плейлист в плеер для дальнейшей обработки
     * @param message {ClientMessage} Сообщение
     * @param playlist {InputTrack[]} Данные трека, видео. Array
     * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
     * @constructor
     */
    PlaylistSys: (message: ClientMessage, playlist: InputPlaylist, voiceChannel: VoiceChannel | StageChannel): void => void message.client.player.emit("playlist", message, playlist, voiceChannel)
}
/**
 * @description Все доступные запросы для получения трека
 */
const BaseGetTrack = {
    YT_getVideo: (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) => {
        setImmediate(() => {
            YouTube.getVideo(search).then((video: InputTrack) => {
                if (!video) return SendEmptyDataMessage(message, `${message.author}, **YouTube** не хочет делится данными! Существует ли это видео вообще!`);
                return PlayerSys.Default(video, message, voiceChannel);
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **YouTube** не хочет делится данными! Произошла ошибка!`);
            });
        });
    },
    SP_getTrack: (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) => {
        setImmediate(() => {
            Spotify.getTrack(search).then((track: InputTrack) => {
                if (!track?.isValid) return SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Существует ли это трек вообще!`);

                return PlayerSys.Default(track, message, voiceChannel);
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Произошла ошибка!`);
            });
        });
    },
    VK_getTrack: (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) => {
        setImmediate(() => {
            VK.getTrack(search).then((track: InputTrack) => {
                if (!track) return SendEmptyDataMessage(message, `${message.author}, **VK** не хочет делится данными! Существует ли это трек вообще!`);

                return PlayerSys.Default(track, message, voiceChannel)
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **VK** не хочет делится данными! Произошла ошибка!`);
            });
        });
    },
    SC_getTrack: (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) => {
        setImmediate(() => {
            Spotify.getTrack(search).then((track: InputTrack) => {
                if (!track?.isValid) return SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Существует ли это трек вообще!`);

                return PlayerSys.Default(track, message, voiceChannel);
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Произошла ошибка!`);
            });
        });
    },
    Discord_getTrack: (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) => {
        setImmediate(() => {
            const attachment = message.attachments.last();
            if (attachment) search = attachment.url;

            new FFprobe(["-i", search]).getInfo().then((trackInfo: any) => {
                if (!trackInfo) return SendEmptyDataMessage(message, `${message.author}, я не нахожу в этом файле звуковую дорожку!`);

                const TrackData: InputTrack = {
                    url: search,
                    title: search.split("/").pop(),
                    author: {
                        url: `https://discordapp.com/users/${message.author.id}`,
                        title: message.author.username,
                        isVerified: false,
                        image: { url: message.author.avatarURL() }
                    },
                    image: { url: NotImage },
                    duration: { seconds: trackInfo.format.duration },
                    format: { url: trackInfo.format.filename }
                };

                return PlayerSys.Default(TrackData, message, voiceChannel);
            });
        });
    }
}
/**
 * @description Все доступные запросы для получения плейлиста
 */
const BaseGetPlaylist = {
    YT_getPlaylist: (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) => {
        setImmediate(() => {
            YouTube.getPlaylist(search).then((playlist: InputPlaylist) => {
                if (!playlist) return SendEmptyDataMessage(message, `${message.author}, **YouTube** не хочет делится данными! Существует ли это плейлист вообще!`);

                return PlayerSys.PlaylistSys(message, playlist, voiceChannel);
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **YouTube** не хочет делится данными! Произошла ошибка!`);
            });
        });
    },
    SP_getPlaylist: (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) => {
        setImmediate(() => {
            Spotify.getPlaylist(search).then((playlist: InputPlaylist) => {
                if (!playlist?.title) return SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Существует ли это плейлист вообще!`);

                return PlayerSys.PlaylistSys(message, playlist, voiceChannel)
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Произошла ошибка!`);
            });
        });
    },
    VK_getPlaylist: (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) => {
        setImmediate(() => {
            VK.getPlaylist(search).then((playlist: InputPlaylist) => {
                if (!playlist) return SendEmptyDataMessage(message, `${message.author}, **VK** не хочет делится данными! Существует ли это плейлист вообще!`);

                return PlayerSys.PlaylistSys(message, playlist, voiceChannel);
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **VK** не хочет делится данными! Произошла ошибка!`);
            });
        });
    },
    SC_getPlaylist: (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) => {
        setImmediate(() => {
            SoundCloud.getPlaylist(search).then((playlist: InputPlaylist) => {
                if (!playlist) return SendEmptyDataMessage(message, `${message.author}, **SoundCloud** не хочет делится данными! Существует ли это плейлист вообще!`);

                return PlayerSys.PlaylistSys(message, playlist, voiceChannel)
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **SoundCloud** не хочет делится данными! Произошла ошибка!`);
            });
        });
    }
}
/**
 * @description Все доступные запросы для получения результата поиска
 */
const BaseSearchTracks = {
    YT_Search: (message: ClientMessage, voiceChannel: VoiceChannel | StageChannel, searchString: string) => {
        setImmediate(() => {
            YouTube.SearchVideos(searchString).then((result: InputTrack[]) => {
                if (!result) return SendEmptyDataMessage(message, `${message.author}, я нечего не нашел в **YouTube**`);

                return SendMessage(message, result, voiceChannel, ArraySort(result, message, "yt"), result.length, "yt");
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **YouTube** не хочет делится данными! Произошла ошибка!`);
            });
        });
    },
    SP_Search: (message: ClientMessage, voiceChannel: VoiceChannel | StageChannel, searchString: string) => {
        setImmediate(() => {
            Spotify.SearchTracks(searchString).then((result) => {
                if (!result || !result.items) return SendEmptyDataMessage(message, `${message.author}, я нечего не нашел в **Spotify**`);

                return SendMessage(message, result?.items, voiceChannel, ArraySort(result?.items, message, "sp"), result.items?.length, "sp")
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Произошла ошибка!`);
            });
        });
    },
    VK_Search: (message: ClientMessage, voiceChannel: VoiceChannel | StageChannel, searchString: string) => {
        setImmediate(() => {
            VK.SearchTracks(searchString).then((result) => {
                if (!result || !result.items) return SendEmptyDataMessage(message, `${message.author}, я нечего не нашел в **VK*`);

                return SendMessage(message, result?.items, voiceChannel, ArraySort(result?.items, message, "vk"), result?.items?.length, "vk");
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **VK** не хочет делится данными! Произошла ошибка!`);
            });
        });
    },
    SC_Search: (message: ClientMessage, voiceChannel: VoiceChannel | StageChannel, searchString: string) => {
        setImmediate(() => {
            return SoundCloud.SearchTracks(searchString).then((result) => {
                if (!result) return SendEmptyDataMessage(message, `${message.author}, я нечего не нашел в **SoundCloud**`);

                return SendMessage(message, result, voiceChannel, ArraySort(result, message, "sc"), result?.length, "sc")
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **SoundCloud** не хочет делится данными! Произошла ошибка!`);
            });
        });
    }
}
/**
 * @description Все доступные запросы для получения альбома
 */
const BaseGetAlbum = {
    SP_getAlbum: (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel) => {
        setImmediate(() => {
            Spotify.getAlbum(search).then((playlist: InputPlaylist) => {
                if (!playlist?.title) return SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Существует ли это альбом вообще!`)

                return PlayerSys.PlaylistSys(message, playlist, voiceChannel)
            }).catch((err) => {
                console.error(err);
                return SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Произошла ошибка!`);
            });
        });
    }
}
//====================== ====================== ====================== ======================
/**
 * @description Спрашиваем у пользователя, что ему надо!
 * @param message {ClientMessage} Сообщение
 * @param search {string} Ссылка
 * @param voiceChannel {VoiceChannel | StageChannel} Голосовой канал
 * @constructor
 */
const ChangerGetting = (message: ClientMessage, search: string, voiceChannel: VoiceChannel | StageChannel) => {
    message.channel.send(`\`\`\`css\nЯ обнаружил в этой ссылке, видео и плейлист. Что включить\n\n1️⃣ - Включить плейлист\n2️⃣ - Включить видео\`\`\``).then((msg: ClientMessage) => {
        setImmediate(() => {
            Reaction(msg, message, "1️⃣", () => {
                deleteMessage(msg as any);
                return BaseGetPlaylist.YT_getPlaylist(search, message, voiceChannel);
            });
            Reaction(msg, message, "2️⃣", () => {
                deleteMessage(msg as any);
                return BaseGetTrack.YT_getVideo(search, message, voiceChannel);
            });

            setTimeout(() => {
                deleteMessage(msg as any);
                deleteMessage(message);
            }, 10e3);
        });
    });
}


export class CommandPlay extends Command {
    public constructor() {
        super({
            name: "play",
            aliases: ["p", "playing", "з"],
            description: "Включение музыки по ссылке или названию, можно прикрепить свой файл!",

            permissions: {client: ["Speak", "Connect"], user: []},
            options: [
                {
                    name: "url-name-type",
                    description: "Укажи что нужно, ссылку, название или тип поиска и название",
                    required: true,
                    type: ApplicationCommandOptionType.String
                },
                {
                    name: "search",
                    description: "Прошлый аргумент, тип? Если да, тут название трека!",
                    required: false,
                    type: ApplicationCommandOptionType.String
                }
            ],
            enable: true,
            slash: true,
            CoolDown: 8
        })
    };

    public run = (message: ClientMessage, args: string[]): void => {
        const voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel, search: string = args.join(" "),
            queue: Queue = message.client.queue.get(message.guild.id);

        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: "RED"
        });

        if (!voiceChannel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: "RED"
        });

        if (!search && !message.attachments) return message.client.Send({
            text: `${message.author}, Укажи ссылку, название или прикрепи файл!`,
            message,
            color: "RED"
        });

        try {
            return this.#getInfoPlatform(search, message, voiceChannel);
        } catch (e) {
            console.log(`[PlayCommand]: [ERROR] -> `, e);
            return message.client.Send({
                text: `${message.author.username} | Произошла ошибка: ${e}`, message, color: "RED", type: "css"
            });
        }
    };
    //Выбираем платформу
    #getInfoPlatform = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        if (search.match(youtubeStr)) return this.#PlayYouTube(message, search, voiceChannel);
        else if (search.match(spotifySrt)) return this.#PlaySpotify(message, search, voiceChannel);
        else if (search.match(/vk.com/)) return this.#PlayVK(message, search, voiceChannel);
        else if (search.match(SoundCloudSrt)) return this.#PlaySoundCloud(message, search, voiceChannel);
        else if (search.match(/cdn.discordapp.com/) || message.attachments?.last()?.url) return BaseGetTrack.Discord_getTrack(search, message, voiceChannel);
        const SplitSearch = search.split(' ');
        const SearchType = SplitSearch[0].toLowerCase();

        if (SearchType === "sp") {
            delete SplitSearch[0];
            return BaseSearchTracks.SP_Search(message, voiceChannel, SplitSearch.join(' '));
        } else if (SearchType === "vk") {
            delete SplitSearch[0];
            return BaseSearchTracks.VK_Search(message, voiceChannel, SplitSearch.join(' '));
        } else if (SearchType === "sc") {
            delete SplitSearch[0];
            return BaseSearchTracks.SC_Search(message, voiceChannel, SplitSearch.join(' '));
        }

        return BaseSearchTracks.YT_Search(message, voiceChannel, search);
    };
    //Для системы youtube
    #PlayYouTube = (message: ClientMessage, search: string, voiceChannel: VoiceChannel | StageChannel): void => {
        if (search.match(/v=/) && search.match(/list=/)) return ChangerGetting(message, search, voiceChannel);
        if (search.match(/playlist/)) return BaseGetPlaylist.YT_getPlaylist(search, message, voiceChannel);
        return BaseGetTrack.YT_getVideo(search, message, voiceChannel);
    };
    //Для системы spotify
    #PlaySpotify = (message: ClientMessage, search: string, voiceChannel: VoiceChannel | StageChannel): void => {
        if (search.match(/playlist/)) return BaseGetPlaylist.SP_getPlaylist(search, message, voiceChannel);
        if (search.match(/album/)) return BaseGetAlbum.SP_getAlbum(search, message, voiceChannel);
        return BaseGetTrack.SP_getTrack(search, message, voiceChannel);
    };
    //Для системы VK
    #PlayVK = (message: ClientMessage, search: string, voiceChannel: VoiceChannel | StageChannel): void => {
        if (search.match(/playlist/)) return BaseGetPlaylist.VK_getPlaylist(search, message, voiceChannel);
        return BaseGetTrack.VK_getTrack(search, message, voiceChannel);
    };
    //Для системы SoundCloud
    #PlaySoundCloud = (message: ClientMessage, search: string, voiceChannel: VoiceChannel | StageChannel): void => {
        if (search.match(/sets/) || search.match(/albums/)) return BaseGetPlaylist.SC_getPlaylist(search, message, voiceChannel);
        return BaseGetTrack.SC_getTrack(search, message, voiceChannel);
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Собираем найденные треки в <string>
 * @param results {any[]} Результаты поиска
 * @param message {ClientMessage} Сообщение
 * @param type {TypeSearch} Платформа на которой искали
 * @constructor
 */
function ArraySort(results: InputTrack[], message: ClientMessage, type: TypeSearch): string {
    let NumberTrack = 1, String;

    // @ts-ignore
    results.ArraySort(15).forEach((s: InputTrack[]) => {
        String = s.map((video) => {
            const NameTrack = `[${message.client.ConvertedText(video.title, 80, true)}]`;
            const DurationTrack = `[${ConvertTimeSearch(video.duration.seconds, type) ?? "LIVE"}]`;
            const AuthorTrack = `[${message.client.ConvertedText(video.author.title, 12, true)}]`;

            return `${NumberTrack++} ➜ ${DurationTrack} | ${AuthorTrack} | ${NameTrack}`;
        }).join("\n");
    });
    return String;
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
function SendMessage(message: ClientMessage, results: any[], voiceChannel: VoiceChannel | StageChannel, resp: string, num: number, type: TypeSearch): void {
    setImmediate(() => {
        if (results.length < 1) return message.client.Send({text: `${message.author} | Я не смог найти музыку с таким названием. Попробуй другое название!`, message, color: "RED"});

        message.channel.send(`\`\`\`css\nВыбери от 1 до ${results.length}\n[Платформа: ${isType(type)} | Запросил: ${message.author}]\n\n${resp}\`\`\``).then((msg: ClientMessage) => {
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
    collector.once("collect", (m: any): void => {
        setImmediate(() => {
            deleteMessage(msg);
            deleteMessage(m);
            collector?.stop();
            return pushSong(results, m, message, voiceChannel, type);
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
        if (type === "sp") return BaseGetTrack.SP_getTrack(results[parseInt(m.content) - 1].url, message, voiceChannel);
        else if (type === "vk") return BaseGetTrack.VK_getTrack(results[parseInt(m.content) - 1].url, message, voiceChannel);
        else if (type === "sc") return BaseGetTrack.SC_getTrack(results[parseInt(m.content) - 1].url, message, voiceChannel);
        return BaseGetTrack.YT_getVideo(results[parseInt(m.content) - 1].url, message, voiceChannel);
    });
}
//====================== ====================== ====================== ======================
/**
 * @description Удаляем сообщение
 * @param msg {ClientMessage} Сообщение которое надо удалить
 */
function deleteMessage(msg: ClientMessage): void {
    setTimeout(() => msg.delete().catch(() => null), 1000);
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
        msg.react(emoji).then(() => {
            msg.createReactionCollector({
                filter: (reaction: MessageReaction, user: User) => (reaction.emoji.name === emoji && user.id !== message.client.user.id),
                max: 1, time: 25e3
            }).once("collect", callback);
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
    return msg.channel.createMessageCollector({filter: (m: any) => !isNaN(m.content) && m.content <= num && m.content > 0 && m.author.id === message.author.id, max: 1});
}
//====================== ====================== ====================== ======================
/**
 * @description Из типа делаем полноценное слово
 * @param type {TypeSearch} Платформа на которой искали
 */
function isType(type: TypeSearch) {
    if (type === "sp") return  "SPOTIFY";
    else if (type === "yt") return "YOUTUBE"
    else if (type === "vk") return "VK";
    else if (type === "sc") return "SOUNDCLOUD";

    return "UNKNOWN";
}
//====================== ====================== ====================== ======================
/**
 * @description Конвертируем время в 00:00
 * @param duration {string} Время трека
 * @param type {TypeSearch} Платформа на которой искали
 * @constructor
 */
function ConvertTimeSearch(duration: string, type: TypeSearch) {
    if (type === "yt") return duration;
    return ParseTimeString(parseInt(duration));
}

function SendEmptyDataMessage(message: ClientMessage, text: string): void {
    message.client.Send({text, color: "RED", message});
}