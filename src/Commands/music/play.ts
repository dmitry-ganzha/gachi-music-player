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
import {ParserTimeSong} from "../../Core/Player/Manager/Duration/ParserTimeSong";
import {FFprobe} from "../../Core/Player/FFmpeg";
import {NotImage} from "../../Core/Player/Structures/Message/Helper";

const youtubeStr = /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi;
const spotifySrt = /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi;
const SoundCloudSrt = /^(?:(https?):\/\/)?(?:(?:www|m)\.)?(api\.soundcloud\.com|soundcloud\.com|snd\.sc)\/(.*)$/;
const HttpORHttps = /^(https?:\/\/|http?:\/\/)\/.+$/gi;

export class CommandPlay extends Command {
    public constructor() {
        super({
            name: "play",
            aliases: ["p", "playing", "з"],
            description: 'Включение музыки по ссылке или названию, можно прикрепить свой файл!',

            permissions: {client: ['Speak', 'Connect'], user: []},
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
        const voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel, search: string = args.join(' '),
            queue: Queue = message.client.queue.get(message.guild.id);

        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({
            text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`,
            message,
            color: 'RED'
        });

        if (!voiceChannel || !message.member.voice) return message.client.Send({
            text: `${message.author}, Подключись к голосовому каналу!`,
            message,
            color: 'RED'
        });

        if (!search && !message.attachments) return message.client.Send({
            text: `${message.author}, Укажи ссылку, название или прикрепи файл!`,
            message,
            color: "RED"
        });

        try {
            if (search.match(HttpORHttps)) message.client.Send({ text: `🔎 Search | ${search}`, message, color: "GREY", type: "css" });
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
        else if (search.match(/cdn.discordapp.com/) || message.attachments?.last()?.url) return new HandleInfoResource().Discord_getMedia(search, message, voiceChannel);
        const SplitSearch = search.split(' ');
        const SearchType = SplitSearch[0].toLowerCase();

        if (SearchType === 'sp') {
            delete SplitSearch[0];
            return new HandleInfoResource().SP_SearchTracks(message, voiceChannel, SplitSearch.join(' '));
        } else if (SearchType === 'vk') {
            delete SplitSearch[0];
            return new HandleInfoResource().VK_SearchTracks(SplitSearch.join(' '), message, voiceChannel);
        } else if (SearchType === 'sc') {
            delete SplitSearch[0];
            return new HandleInfoResource().SC_SearchTracks(SplitSearch.join(' '), message, voiceChannel);
        }

        return new HandleInfoResource().YT_SearchVideos(message, voiceChannel, search);
    };
    //Для системы youtube
    #PlayYouTube = (message: ClientMessage, search: string, voiceChannel: VoiceChannel | StageChannel): void => {
        if (search.match(/v=/) && search.match(/list=/)) return new HandleInfoResource().ChangeRes(message, search, voiceChannel);
        if (search.match(/playlist/)) return new HandleInfoResource().YT_getPlaylist(search, message, voiceChannel);
        return new HandleInfoResource().YT_getVideo(search, message, voiceChannel);
    };
    //Для системы spotify
    #PlaySpotify = (message: ClientMessage, search: string, voiceChannel: VoiceChannel | StageChannel): void => {
        if (search.match(/playlist/)) return new HandleInfoResource().SP_getPlaylist(search, message, voiceChannel);
        if (search.match(/album/)) return new HandleInfoResource().SP_getAlbum(search, message, voiceChannel);
        return new HandleInfoResource().SP_getTrack(search, message, voiceChannel);
    };
    //Для системы VK
    #PlayVK = (message: ClientMessage, search: string, voiceChannel: VoiceChannel | StageChannel): void => {
        if (search.match(/playlist/)) return new HandleInfoResource().VK_getPlaylist(search, message, voiceChannel);
        return new HandleInfoResource().VK_getTrack(search, message, voiceChannel);
    };
    //Для системы SoundCloud
    #PlaySoundCloud = (message: ClientMessage, search: string, voiceChannel: VoiceChannel | StageChannel): void => {
        if (search.match(/sets/) || search.match(/albums/)) return new HandleInfoResource().SC_getPlaylist(search, message, voiceChannel);
        return new HandleInfoResource().SC_getTrack(search, message, voiceChannel);
    };
}

class HandleInfoResource {
    //Для поиска музыки
    #collector: MessageCollector = null;
    #type: "yt" | "sp" | "vk" | "sc" = null;

    //Discord (discord.com) взаимодействие с discord (можно включить свой трек)
    public Discord_getMedia = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        setImmediate(() => {
            const attachment = message.attachments.last();
            if (attachment) search = attachment.url;

            new FFprobe(["-i", search]).getInfo().then((trackInfo: any) => {
                if (!trackInfo) return this.#SendEmptyDataMessage(message, `${message.author}, я не нахожу в этом файле звуковую дорожку!`);

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

                return this.#runPlayer(TrackData, message, voiceChannel);
            });
        });
    };

    //YouTube (youtube.com) взаимодействие с youtube
    public YT_getVideo = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        setImmediate(() => {
            YouTube.getVideo(search).then((video: InputTrack) => {
                if (!video) return this.#SendEmptyDataMessage(message, `${message.author}, **YouTube** не хочет делится данными! Существует ли это видео вообще!`);
                this.#runPlayer(video, message, voiceChannel);
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **YouTube** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };
    public YT_getPlaylist = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        setImmediate(() => {
            YouTube.getPlaylist(search).then((playlist: InputPlaylist) => {
                if (!playlist) return this.#SendEmptyDataMessage(message, `${message.author}, **YouTube** не хочет делится данными! Существует ли это плейлист вообще!`);

                return this.#runPlaylistSystem(message, playlist, voiceChannel);
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **YouTube** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };
    public YT_SearchVideos = (message: ClientMessage, voiceChannel: VoiceChannel | StageChannel, searchString: string): void => {
        this.#type = "yt";

        setImmediate(() => {
            YouTube.SearchVideos(searchString).then((result: InputTrack[]) => {
                if (!result) return this.#SendEmptyDataMessage(message, `${message.author}, я нечего не нашел в **YouTube**`);

                return this.#SendMessage(message, result, voiceChannel, this.#ArraySort(result, message), result.length);
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **YouTube** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };

    //Spotify (open.spotify.com) взаимодействие с spotify
    public SP_getTrack = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        setImmediate(() => {
            Spotify.getTrack(search).then((track: InputTrack) => {
                if (!track?.isValid) return this.#SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Существует ли это трек вообще!`);

                return this.#runPlayer(track, message, voiceChannel);
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };
    public SP_getPlaylist = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        setImmediate(() => {
            Spotify.getPlaylist(search).then((playlist: InputPlaylist) => {
                if (!playlist?.title) return this.#SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Существует ли это плейлист вообще!`)

                return this.#runPlaylistSystem(message, playlist, voiceChannel)
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };
    public SP_getAlbum = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        setImmediate(() => {
            Spotify.getAlbum(search).then((playlist: InputPlaylist) => {
                if (!playlist?.title) return this.#SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Существует ли это альбом вообще!`)

                return this.#runPlaylistSystem(message, playlist, voiceChannel)
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };
    public SP_SearchTracks = (message: ClientMessage, voiceChannel: VoiceChannel | StageChannel, searchString: string): void => {
        this.#type = "sp";

        setImmediate(() => {
            Spotify.SearchTracks(searchString).then((result) => {
                if (!result || !result.items) return this.#SendEmptyDataMessage(message, `${message.author}, я нечего не нашел в **Spotify**`);

                this.#SendMessage(message, result?.items, voiceChannel, this.#ArraySort(result?.items, message), result.items?.length)
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **Spotify** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };

    //VK (vk.com) взаимодействие с vk
    public VK_getTrack = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        setImmediate(() => {
            VK.getTrack(search).then((track: InputTrack) => {
                if (!track) return this.#SendEmptyDataMessage(message, `${message.author}, **VK** не хочет делится данными! Существует ли это трек вообще!`);
                return this.#runPlayer(track, message, voiceChannel)
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **VK** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };
    public VK_getPlaylist = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        setImmediate(() => {
            VK.getPlaylist(search).then((playlist: InputPlaylist) => {
                if (!playlist) return this.#SendEmptyDataMessage(message, `${message.author}, **VK** не хочет делится данными! Существует ли это плейлист вообще!`);

                return this.#runPlaylistSystem(message, playlist, voiceChannel);
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **VK** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };
    public VK_SearchTracks = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        this.#type = "vk";
        setImmediate(() => {
            VK.SearchTracks(search).then((result) => {
                if (!result || !result.items) return this.#SendEmptyDataMessage(message, `${message.author}, я нечего не нашел в **VK*`);

                return this.#SendMessage(message, result?.items, voiceChannel, this.#ArraySort(result?.items, message), result?.items?.length);
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **VK** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };

    //SoundCloud (soundcloud.com) взаимодействие с SoundCloud
    public SC_getTrack = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        setImmediate(() => {
            SoundCloud.getTrack(search).then((track: InputTrack) => {
                if (!track) return this.#SendEmptyDataMessage(message, `${message.author}, **SoundCloud** не хочет делится данными! Существует ли это трек вообще!`);

                return this.#runPlayer(track, message, voiceChannel);
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **SoundCloud** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };
    public SC_getPlaylist = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        setImmediate(() => {
            SoundCloud.getPlaylist(search).then((playlist: InputPlaylist) => {
                if (!playlist) return this.#SendEmptyDataMessage(message, `${message.author}, **SoundCloud** не хочет делится данными! Существует ли это плейлист вообще!`);

                return this.#runPlaylistSystem(message, playlist, voiceChannel)
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **SoundCloud** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };
    public SC_SearchTracks = (search: string, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        this.#type = "sc";

        setImmediate(() => {
            return SoundCloud.SearchTracks(search).then((result) => {
                if (!result) return this.#SendEmptyDataMessage(message, `${message.author}, я нечего не нашел в **SoundCloud**`);

                return this.#SendMessage(message, result, voiceChannel, this.#ArraySort(result, message), result?.length)
            }).catch((err) => {
                console.error(err);
                return this.#SendEmptyDataMessage(message, `${message.author}, **SoundCloud** не хочет делится данными! Произошла ошибка!`);
            });
        });
    };

    //Создаем сборщик для выбора плейлиста или трека
    public ChangeRes = (message: ClientMessage, search: string, voiceChannel: VoiceChannel | StageChannel) => {
        message.channel.send(`\`\`\`css\nЯ обнаружил в этой ссылке, видео и плейлист. Что включить\n\n1️⃣ - Включить плейлист\n2️⃣ - Включить видео\`\`\``).then((msg: ClientMessage) => {
            setImmediate(() => {
                this.#Reaction(msg, message, "1️⃣", () => {
                    this.#deleteMessage(msg as any);
                    return this.YT_getPlaylist(search, message, voiceChannel);
                });
                this.#Reaction(msg, message, "2️⃣", () => {
                    this.#deleteMessage(msg as any);
                    return this.YT_getVideo(search, message, voiceChannel);
                });

                setTimeout(() => {
                    this.#deleteMessage(msg as any);
                    this.#deleteMessage(message);
                    return this.#collector?.stop();
                }, 10e3);
            });
        });
    }

    //Какое перенаправление делаем в систему плейлистов или просто добавим трек?
    #runPlayer = (video: InputTrack, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => void message.client.player.emit('play', message, voiceChannel, video);
    #runPlaylistSystem = (message: ClientMessage, playlist: InputPlaylist, voiceChannel: VoiceChannel | StageChannel): void => void message.client.player.emit('playlist', message, playlist, voiceChannel);

    //Создаем сборщик для поиска треков
    #ArraySort = (results: InputTrack[], message: ClientMessage): string => {
        let NumberTrack = 1, String;

        // @ts-ignore
        results.ArraySort(15).forEach((s: InputTrack[]) => {
            String = s.map((video) => {
                const NameTrack = `[${message.client.ConvertedText(video.title, 80, true)}]`;
                const DurationTrack = `[${this.#ConvertTimeSearch(video.duration.seconds) ?? "LIVE"}]`;
                const AuthorTrack = `[${message.client.ConvertedText(video.author.title, 12, true)}]`;

                return `${NumberTrack++} ➜ ${DurationTrack} | ${AuthorTrack} | ${NameTrack}`;
            }).join("\n");
        });
        return String;
    };
    #SendMessage = (message: ClientMessage, results: any[], voiceChannel: VoiceChannel | StageChannel, resp: string, num: number): void => {
        setImmediate(() => {
            if (results.length < 1) return message.client.Send({text: `${message.author} | Я не смог найти музыку с таким названием. Попробуй другое название!`, message, color: "RED"});

            message.channel.send(`\`\`\`css\nВыбери от 1 до ${results.length}\n[Платформа: ${this.#isType()} | Запросил: ${message.author}]\n\n${resp}\`\`\``).then((msg: ClientMessage) => {
                this.#Reaction(msg, message, "❌", () => {
                    this.#collector?.stop();
                    this.#deleteMessage(msg);
                });
                this.#MessageCollector(msg, message, num);
                return this.#CollectorCollect(msg, results, message, voiceChannel);
            });
        });
    };
    //Добавляем к коллектору ивент сбора
    #CollectorCollect = (msg: ClientMessage, results: any[], message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        this.#collector.once('collect', (m: any): void => {
            setImmediate(() => {
                this.#deleteMessage(msg);
                this.#deleteMessage(m);
                this.#collector.stop();
                return this.#pushSong(results, m, message, voiceChannel);
            });
        });
    }
    //Из типа выдает поиск трека
    #pushSong = (results: any[], m: ClientMessage, message: ClientMessage, voiceChannel: VoiceChannel | StageChannel): void => {
        setImmediate(() => {
            if (this.#type === "sp") return this.SP_getTrack(results[parseInt(m.content) - 1].url, message, voiceChannel);
            else if (this.#type === "vk") return this.VK_getTrack(results[parseInt(m.content) - 1].url, message, voiceChannel);
            else if (this.#type === "sc") return this.SC_getTrack(results[parseInt(m.content) - 1].url, message, voiceChannel);
            return this.YT_getVideo(results[parseInt(m.content) - 1].url, message, voiceChannel);
        });
    };
    //Удаляем сообщение
    #deleteMessage = (msg: ClientMessage): NodeJS.Timeout => setTimeout(() => msg.delete().catch(() => null), 1000);
    //Добавляем реакцию (эмодзи)
    #Reaction = (msg: ClientMessage | any, message: ClientMessage, emoji: string, callback: any): void => {
        setImmediate(() => {
            msg.react(emoji).then(() => {
                msg.createReactionCollector({
                    filter: (reaction: MessageReaction, user: User) => (reaction.emoji.name === emoji && user.id !== message.client.user.id),
                    max: 1
                }).once('collect', callback);
            });
        });
    }
    //Создаем коллектор (discord.js) для обработки сообщений от пользователя
    #MessageCollector = (msg: ClientMessage, message: ClientMessage, num: any): any => this.#collector = msg.channel.createMessageCollector({filter: (m: any) => !isNaN(m.content) && m.content <= num && m.content > 0 && m.author.id === message.author.id, max: 1});
    //Тип поиска
    #isType = () => {
        if (this.#type === "sp") return  "SPOTIFY";
        else if (this.#type === "yt") return "YOUTUBE"
        else if (this.#type === "vk") return "VK";
        else if (this.#type === "sc") return "SOUNDCLOUD";

        return "UNKNOWN";
    };
    //Конвертируем время в 00:00
    #ConvertTimeSearch = (duration: string) => {
        if (this.#type === 'yt') return duration;
        return ParserTimeSong(parseInt(duration));
    };

    #SendEmptyDataMessage = (message: ClientMessage, text: string): void => {
        message.client.Send({text, color: "RED", message});
    };
}