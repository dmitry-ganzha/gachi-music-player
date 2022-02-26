import {Command} from "../Constructor";
import {YouTube, Spotify, VK} from "../../Core/SPNK";
import {MessageCollector, ReactionCollector, StageChannel, VoiceChannel} from "discord.js";
import {InputPlaylist, InputTrack, wMessage} from "../../Core/Utils/TypesHelper";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Structures/Queue";
import {ParserTimeSong} from "../../Modules/Music/src/Manager/Functions/ParserTimeSong";

const youtubeStr = /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi;
const spotifySrt = /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi;

export class CommandPlay extends Command {
    public constructor() {
        super({
            name: "play",
            aliases: ["p", "playing", "з"],
            description: 'Воспроизведение плейлиста по URL или по названию музыки',

            permissions: {client: ['Speak', 'Connect'], user: []},
            options: [
                {
                    name: "song-or-type",
                    description: "Song (url, name) - (YouTube, Spotify, VK). Search type - (yt, sp, vk)",
                    required: true,
                    type: "STRING"
                },
                {
                    name: "search",
                    description: "Name song. (YouTube, Spotify, VK)",
                    required: false,
                    type: "STRING"
                }
            ],
            enable: true,
            slash: true,
            CoolDown: 8
        })
    };

    public run = async (message: wMessage, args: string[]): Promise<void | boolean | string | MessageCollector> => {
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

        if (!search) return message.client.Send({
            text: `${message.author}, Укажи ссылку, название!`,
            message,
            color: "RED"
        });

        return CommandPlay.getInfoPlatform(search, message, voiceChannel).catch(async (e: Error | string) => {
            console.log(`[PlayCommand]: [ERROR] -> `, e);
            return message.client.Send({
                text: `${message.author}, Error: ${e}`, message, color: "RED"
            });
        });
    };
    protected static getInfoPlatform = async (search: string, message: wMessage, voiceChannel: VoiceChannel | StageChannel): Promise<void | boolean | MessageCollector> => {
        if (search.match(youtubeStr)) return this.PlayYouTube(message, search, voiceChannel);
        else if (search.match(spotifySrt)) return this.PlaySpotify(message, search, voiceChannel);
        else if (search.match(/vk.com/)) return this.PlayVK(message, search, voiceChannel);
        const SplitSearch = search.split(' ');
        const SearchType = SplitSearch[0].toLowerCase();

        if (SearchType === 'sp') {
            delete SplitSearch[0];
            return new HandleInfoResource().SP_SearchTracks(message, voiceChannel, SplitSearch.join(' '));
        } else if (SearchType === 'vk') {
            delete SplitSearch[0];
            return new HandleInfoResource().VK_SearchTracks(SplitSearch.join(' '), message, voiceChannel);
        }

        return new HandleInfoResource().YT_SearchVideos(message, voiceChannel, search);
    };
    protected static PlayYouTube = async (message: wMessage, search: string, voiceChannel: VoiceChannel | StageChannel): Promise<void | boolean> => {
        if (search.match(/v=/) && search.match(/list=/)) return new HandleInfoResource().ChangeRes(message, search, voiceChannel);
        if (search.match(/playlist/)) return new HandleInfoResource().YT_getPlaylist(search, message, voiceChannel);
        return new HandleInfoResource().YT_getVideo(search, message, voiceChannel);
    };
    protected static PlaySpotify = async (message: wMessage, search: string, voiceChannel: VoiceChannel | StageChannel): Promise<void| boolean> => {
        if (search.match(/playlist/)) return new HandleInfoResource().SP_getPlaylist(search, message, voiceChannel);
        if (search.match(/album/)) return new HandleInfoResource().SP_getAlbum(search, message, voiceChannel);
        return new HandleInfoResource().SP_getTrack(search, message, voiceChannel);
    };
    protected static PlayVK = async (message: wMessage, search: string, voiceChannel: VoiceChannel | StageChannel): Promise<void| boolean> => {
        if (search.match(/playlist/)) return new HandleInfoResource().VK_getPlaylist(search, message, voiceChannel);
        return new HandleInfoResource().VK_getTrack(search, message, voiceChannel);
    };
}

class HandleInfoResource {
    //Для поиска музыки
    protected collector: MessageCollector = null;
    protected type: "yt" | "sp" | "vk" = null;

    //YouTube (youtube.com) взаимодействие с youtube
    public YT_getVideo = async (search: string, message: wMessage, voiceChannel: VoiceChannel | StageChannel): Promise<void | boolean> => YouTube.getVideo(search).then(async (video: InputTrack) => !video ? message.client.Send({text: `${message.author}, Хм, YouTube не хочет делится данными! Существует ли это видео вообще!`, message: message, color: 'RED'}) : this.runPlayer(video, message, voiceChannel));
    public YT_getPlaylist = async (search: string, message: wMessage, voiceChannel: VoiceChannel | StageChannel): Promise<void | boolean> => YouTube.getPlaylist(search).then(async (playlist: InputPlaylist) => !playlist ? message.client.Send({text: `${message.author}, Хм, YouTube не хочет делится данными! Существует ли это плейлист вообще!`, message: message, color: 'RED'}) : this.runPlaylistSystem(message, playlist, voiceChannel));
    public YT_SearchVideos = async (message: wMessage, voiceChannel: VoiceChannel | StageChannel, searchString: string): Promise<void | MessageCollector> => {
        this.type = "yt";
        return YouTube.SearchVideos(searchString).then(async (result: InputTrack[]) => this.SendMessage(message, result, voiceChannel, await this.ArraySort(result, message), result.length));
    };

    //Spotify (open.spotify.com) взаимодействие с spotify
    public SP_getTrack = async (search: string, message: wMessage, voiceChannel: VoiceChannel | StageChannel): Promise<void | boolean> => new Spotify().getTrack(search).then(async (track: InputTrack) => !track?.isValid ? message.client.Send({text: `Хм, Spotify не хочет делится данными! Существует ли это трек вообще!`, message: message, color: 'RED'}) : this.runPlayer(track, message, voiceChannel));
    public SP_getPlaylist = async (search: string, message: wMessage, voiceChannel: VoiceChannel | StageChannel): Promise<void | boolean> => new Spotify().getPlaylistTracks(search).then(async (playlist: InputPlaylist) => !playlist?.title ? message.client.Send({text: `${message.author}, Хм, Spotify не хочет делится данными! Существует ли это плейлист вообще!`, message: message, color: 'RED'}) : this.runPlaylistSystem(message, playlist, voiceChannel));
    public SP_getAlbum = async (search: string, message: wMessage, voiceChannel: VoiceChannel | StageChannel): Promise<void | boolean> => new Spotify().getAlbumTracks(search).then(async (playlist: InputPlaylist) => !playlist?.title ? message.client.Send({text: `${message.author}, Хм, Spotify не хочет делится данными! Существует ли это альбом вообще!`, message: message, color: 'RED'}) : this.runPlaylistSystem(message, playlist, voiceChannel));
    public SP_SearchTracks = async (message: wMessage, voiceChannel: VoiceChannel | StageChannel, searchString: string): Promise<void | MessageCollector> => {
        this.type = "sp";
        return new Spotify().SearchTracks(searchString).then(async (result) => this.SendMessage(message, result?.items, voiceChannel, await this.ArraySort(result?.items, message), result.items?.length));
    };

    //VK (vk.com) взаимодействие с vk
    public VK_getTrack = async (search: string, message: wMessage, voiceChannel: VoiceChannel | StageChannel): Promise<void | boolean> => new VK().getTrack(search).then(async (track: InputTrack) => !track ? message.client.Send({text: `Хм, Vk не хочет делится данными! Существует ли это трек вообще!`, message: message, color: 'RED'}) : this.runPlayer(track, message, voiceChannel));
    public VK_getPlaylist = async (search: string, message: wMessage, voiceChannel: VoiceChannel | StageChannel): Promise<void | boolean> => new VK().getPlaylist(search).then(async (playlist: InputPlaylist) => !playlist ? message.client.Send({text: `${message.author}, Хм, Vk не хочет делится данными! Существует ли это плейлист вообще!`, message: message, color: 'RED'}) : this.runPlaylistSystem(message, playlist, voiceChannel));
    public VK_SearchTracks = async (search: string, message: wMessage, voiceChannel: VoiceChannel | StageChannel): Promise<void | MessageCollector> => {
        this.type = "vk";
        return new VK().SearchTracks(search).then(async (result) => this.SendMessage(message, result?.items, voiceChannel, await this.ArraySort(result?.items, message), result?.items?.length));
    };

    //Создаем сборщик для выбора плейлиста или трека
    public ChangeRes = async (message: wMessage, search: string, voiceChannel: VoiceChannel | StageChannel) => message.channel.send(`\`\`\`css\nЯ обнаружил в этой ссылке, видео и плейлист. Что включить\n\n1️⃣ - Включить плейлист\n2️⃣ - Включить видео\`\`\``).then(async (msg) => {
        await this.Reaction(msg, message, "1️⃣", () => {
            this.deleteMessage(msg as any);
            return this.YT_getPlaylist(search, message, voiceChannel);
        });
        await this.Reaction(msg, message, "2️⃣", () => {
            this.deleteMessage(msg as any);
            return this.YT_getVideo(search, message, voiceChannel);
        });

        setTimeout(async () => {
            await this.deleteMessage(msg as any);
            await this.deleteMessage(message);
            return this.collector?.stop();
        }, 10e3);
    })

    //Какое перенаправление делаем в систему плейлистов или просто добавим трек?
    protected runPlayer = async (video: InputTrack, message: wMessage, voiceChannel: VoiceChannel | StageChannel): Promise<boolean> => void message.client.player.emit('play', message, voiceChannel, video);
    protected runPlaylistSystem = async (message: wMessage, playlist: InputPlaylist, voiceChannel: VoiceChannel | StageChannel): Promise<boolean> => void message.client.player.emit('playlist', message, playlist, voiceChannel);

    //Создаем сборщик для поиска треков
    protected ArraySort = async (results: any, message: wMessage): Promise<string> => {
        let num = 1, resp;
        results.ArraySort(15).forEach((s: any) => resp = s.map((video: InputTrack) => (`${num++} ➜ [${this.ConvertTimeSearch(video.duration.seconds) ?? "LIVE"}] [${message.client.ConvertedText(video.author.title, 12, true)}] [${message.client.ConvertedText(video.title, 80, true)}]`)).join(`\n`));
        return resp === undefined ? `😟 Похоже ${this.isType()} не хочет делится поиском, лечу бить ебало!` : resp;
    };
    protected SendMessage = async (message: wMessage, results: any[], voiceChannel: VoiceChannel | StageChannel, resp: string, num: number): Promise<MessageCollector> => message.channel.send(`\`\`\`css\nВыбери от 1 до ${results.length}\n[Find -> ${this.isType()}]\n\n${resp}\`\`\``).then(async (msg: any) => {
        this.Reaction(msg, message, "❌", () => (this.collector?.stop(), this.deleteMessage(msg))).catch((err: Error) => console.log(err));
        await this.MessageCollector(msg, message, num);
        return this.CreateCollector(msg, results, message, voiceChannel);
    });
    protected CreateCollector = async (msg: wMessage, results: any[], message: wMessage, voiceChannel: VoiceChannel | StageChannel): Promise<MessageCollector> => this.collector.on('collect', async (m: any): Promise<any> => {
        await this.deleteMessage(msg);
        await this.deleteMessage(m);
        this.collector.stop();
        return this.pushSong(results, m, message, voiceChannel);
    });
    protected pushSong = async (results: any[], m: wMessage, message: wMessage, voiceChannel: VoiceChannel | StageChannel) => {
        if (this.type === "sp") return this.SP_getTrack(results[parseInt(m.content) - 1].url, message, voiceChannel);
        else if (this.type === "vk") return this.VK_getTrack(results[parseInt(m.content) - 1].url, message, voiceChannel);
        return this.YT_getVideo(results[parseInt(m.content) - 1].url, message, voiceChannel);
    };
    protected deleteMessage = async (msg: wMessage): Promise<NodeJS.Timeout> => setTimeout(async () => msg.delete().catch(() => null), 1000);
    protected Reaction = async (msg: wMessage | any, message: wMessage, emoji: string, callback: any): Promise<ReactionCollector> => msg.react(emoji).then(async () => msg.createReactionCollector({filter: async (reaction: any, user: any) => (reaction.emoji.name === emoji && user.id !== message.client.user.id), max: 1}).on('collect', () => callback()));
    protected MessageCollector = async (msg: wMessage, message: wMessage, num: any): Promise<any> => this.collector = msg.channel.createMessageCollector({filter: async (m: any) => !isNaN(m.content) && m.content <= num && m.content > 0 && m.author.id === message.author.id, max: 1});
    protected isType = () => this.type === "sp" ? "SPOTIFY" : this.type === "yt" ? "YOUTUBE" : this.type === "vk" ? "VK" : undefined;
    protected ConvertTimeSearch = (duration: string) => {
        if (this.type === 'yt') return duration;
        return ParserTimeSong(parseInt(duration));
    };
}