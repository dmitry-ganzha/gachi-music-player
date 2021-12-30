import {Command} from "../Constructor";
import {YouTube, Spotify, all} from "../../Core/SPNK";
import {MessageCollector, ReactionCollector, StageChannel, VoiceChannel} from "discord.js";
import {InputTrack, W_Message} from "../../Core/Utils/W_Message";
import {Queue} from "../../Modules/Music/src/Manager/Queue/Constructors/Queue";
import cfg from "../../db/Config.json";

const youtubeStr = /^(https?:\/\/)?(www\.)?(m\.)?(music\.)?( )?(youtube\.com|youtu\.?be)\/.+$/gi;
const spotifySrt = /^(https?:\/\/)?(open\.)?(m\.)?(spotify\.com|spotify\.?ru)\/.+$/gi;

export default class CommandPlay extends Command {
    constructor() {
        super({
            name: "play",
            aliases: ["p", "playing", "з"],
            description: 'Воспроизведение плейлиста по URL или по названию музыки',

            permissions: {client: ['SPEAK', 'CONNECT'], user: []},
            enable: true
        })
    };

    public run = async (message: W_Message, args: string[]): Promise<void> => {
        this.DeleteMessage(message, 5e3);
        let voiceChannel: VoiceChannel | StageChannel = message.member.voice.channel, search: string = args.join(' '), queue: Queue = message.client.queue.get(message.guild.id);

        if (queue && queue.channels.voice && message.member.voice.channel.id !== queue.channels.voice.id) return message.client.Send({text: `${message.author}, Музыка уже играет в другом голосовом канале!\nМузыка включена тут <#${queue.channels.voice.id}>`, message: message, color: 'RED'});

        if (!voiceChannel || !message.member.voice) return message.client.Send({text: `${message.author}, Подключись к голосовому каналу!`, message: message, color: 'RED'});

        if (!search) return message.client.Send({text: `${message.author}, Укажи ссылку, название!`, message: message, color: "RED"});

        await message.client.Send({text: `🔎 Search: ${message.client.ConvertedText(search, 25)}`, message: message, color: "RANDOM", type: 'css'});

        return this.getInfoPlatform(search, message, voiceChannel).catch(async (e: Error) => message.client.Send({text: `${message.author}, Я нечего не нашел! Error: ${e}`, message: message, color: "RED"}));
    };
    private getInfoPlatform = async (search: string, message: W_Message, voiceChannel: VoiceChannel | StageChannel): Promise<void> => {
        if (search.match(youtubeStr)) return this.PlayYouTube(message, search, voiceChannel);
        else if (search.match(spotifySrt)) return this.PlaySpotify(message, search, voiceChannel);
        else if (search.match(/https/) && cfg.Player.Other.YouTubeDL) return new _YouTubeDl().getInfo(search, message, voiceChannel);
        return new _YouTube().SearchVideos(message, voiceChannel, search);
    };
    private PlayYouTube = async (message: W_Message, search: string, voiceChannel: VoiceChannel | StageChannel): Promise<void> => {
        if (search.match(/playlist/)) return new _YouTube().getPlaylist(search, message, voiceChannel);
        return new _YouTube().getVideo(search, message, voiceChannel);
    };
    private PlaySpotify = async (message: W_Message, search: string, voiceChannel: VoiceChannel | StageChannel): Promise<void> => {
        if (search.match(/playlist/) || search.match(/album/)) return new _Spotify().getPlaylist(search, message, voiceChannel);
        return new _Spotify().getTrack(search, message, voiceChannel);
    };
}
class _YouTube {
    private collector: MessageCollector;
    constructor() {
        this.collector = null;
    };
    public getVideo = async (search: string, message: W_Message, voiceChannel: VoiceChannel | StageChannel): Promise<void> => this.error(new YouTube().getVideo(search).then(async (video: InputTrack) => !video ? message.client.Send({text: `${message.author}, Хм, YouTube не хочет делится данными! Существует ли это видео вообще!`, message: message, color: 'RED'}) : this.runPlayer(video, message, voiceChannel)), message);
    public getPlaylist = async (search: string, message: W_Message, voiceChannel: VoiceChannel | StageChannel): Promise<void> => this.error(new YouTube().getPlaylist(search).then(async (playlist) => !playlist ? message.client.Send({text: `${message.author}, Хм, YouTube не хочет делится данными! Существует ли это плейлист вообще!`, message: message, color: 'RED'}) : this.runPlaylistSystem(message, playlist, voiceChannel)), message);
    public SearchVideos = async (message: W_Message, voiceChannel: VoiceChannel | StageChannel, searchString: string): Promise<void> => this.SearchVideo(searchString).then(async (results) => this.SendMessage(message, results, voiceChannel, await this.ArraySort(results, message), results.length).catch((err) => console.log(err)));

    private SearchVideo = async (searchString: string): Promise<any> => new YouTube().searchVideos(searchString, {limit: 15});
    private ArraySort = async (results: any, message: W_Message): Promise<string> => {
        let num = 1, resp;
        results.ArraySort(15).forEach((s: any) => resp = s.map((video: any) => (`${num++}:  [${video.duration === null ? 'Live' : video.duration}] [${message.client.ConvertedText(video.title, 80, true)}]`)).join(`\n`));
        return resp === undefined ? '😟 Похоже YouTube не хочет делится поиском, лечу бить ебало!' : resp;
    };
    private SendMessage = async (message: W_Message, results: any[], voiceChannel: VoiceChannel | StageChannel, resp: string, num: number): Promise<any> => message.channel.send(`\`\`\`css\nВыбери от 1 до ${results.length}\n\n${resp}\`\`\``).then(async (msg: any) => {
        this.cancelReaction(msg, message).catch((err: Error) => console.log(err));
        await this.MessageCollector(msg, message, num);
        return this.CreateCollector(msg, results, message, voiceChannel);
    });
    private CreateCollector = async (msg: W_Message, results: any[], message: W_Message, voiceChannel: VoiceChannel | StageChannel): Promise<MessageCollector> => this.collector.on('collect', async (m: any) => {
         await this.deleteMessage(msg);
         await this.deleteMessage(m);
         this.collector.stop();
         return this.pushSong(results, m, message, voiceChannel);
    });
    private pushSong = async (results: any[], m: W_Message, message: W_Message, voiceChannel: VoiceChannel | StageChannel): Promise<void> => this.getVideo(results[parseInt(m.content) - 1].url, message, voiceChannel);
    private deleteMessage = async (msg: W_Message): Promise<NodeJS.Timeout> => setTimeout(async () => msg.delete().catch(() => null), 1000);
    private cancelReaction = async (msg: W_Message, message: W_Message): Promise<ReactionCollector> => msg.react('❌').then(async () => msg.createReactionCollector({filter: async (reaction: any, user: any) => (reaction.emoji.name === '❌' && user.id !== message.client.user.id)}).on('collect', () => (this.collector?.stop(), this.deleteMessage(msg))));
    private MessageCollector = async (msg: W_Message, message: W_Message, num: any): Promise<any> => this.collector = msg.channel.createMessageCollector({filter: async (m: any) => !isNaN(m.content) && m.content <= num && m.content > 0 && m.author.id === message.author.id, max: 1});
    private error = async (i: any, message: W_Message): Promise<void> => i.catch(async (err) => message.client.Send({text: `${message.author}, YouTube: ${err.toString()}`, message: message, color: 'RED'}));
    private runPlayer = async (video: any, message: W_Message, voiceChannel: VoiceChannel | StageChannel): Promise<boolean> => (message.client.player.emit('play', message, voiceChannel, video));
    private runPlaylistSystem = async (message: W_Message, playlist: any, voiceChannel: VoiceChannel | StageChannel): Promise<boolean> => (message.client.player.emit('playlist', message, playlist, voiceChannel));
}

class _Spotify {
    public getTrack = async (search: string, message: W_Message, voiceChannel: VoiceChannel | StageChannel): Promise<void> => this.error(new Spotify().getTrack(search).then(async (video: any) => !video?.isValid ? message.client.Send({text: `Хм, Spotify не хочет делится данными! Существует ли это трек вообще!`, message: message, color: 'RED'}) : this.runPlayer(video, message, voiceChannel)), message);
    public getPlaylist = async (search: string, message: W_Message, voiceChannel: VoiceChannel | StageChannel): Promise<void> => this.error(new Spotify().getPlaylist(search).then(async (playlist: any) => !playlist?.title ? message.client.Send({text: `${message.author}, Хм, Spotify не хочет делится данными! Существует ли это плейлист вообще!`, message: message, color: 'RED'}) : this.runPlaylistSystem(message, playlist, voiceChannel)), message);
    private error = async (i: any, message: W_Message) => i.catch(async (err: Error): Promise<void> => message.client.Send({text: `${message.author}, Spotify: ${err.toString()}`, message: message, color: 'RED'}));
    private runPlayer = async (video: any, message: W_Message, voiceChannel: VoiceChannel | StageChannel): Promise<boolean> => (message.client.player.emit('play', message, voiceChannel, video));
    private runPlaylistSystem = async (message: W_Message, playlist: any, voiceChannel: VoiceChannel | StageChannel): Promise<boolean> => (message.client.player.emit('playlist', message, playlist, voiceChannel));
}
class _YouTubeDl {
    public getInfo = async (search: string, message: W_Message, voiceChannel: VoiceChannel | StageChannel): Promise<any> => new all().getTrack(search).then((i: any) => !i.isValid ? this.sendMessage(message) : this.pushSong(i, message, voiceChannel));
    private pushSong = async (song: any, message: W_Message, voiceChannel: VoiceChannel | StageChannel): Promise<boolean> => message.client.player.emit('play', message, voiceChannel, song);
    private sendMessage = async (message: W_Message): Promise<any> => message.client.Send({text: `${message.author}, Я не смог получить данные с этой страницы!`, message: message, color: 'RED'});
}
