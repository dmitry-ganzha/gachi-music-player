import {Duplex, Readable, Writable} from "stream";
import {VK, YouTube} from "../../../../Core/SPNK";
import {Song, ConstFormat} from "../Manager/Queue/Structures/Song";
import {Queue} from "../Manager/Queue/Structures/Queue";
import {InputFormat} from "../../../../Core/Utils/TypesHelper";
import {httpsClient} from "../../../../Core/httpsClient";
import { opus } from "prism-media";
import ChildProcess from "child_process";

const SILENCE_FRAME = Buffer.from([0xf8, 0xff, 0xfe]);
const FFmpegName = process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg";
const FFmpegArguments = {
    OggOpus: ["-acodec", "libopus", "-f", "opus"],
    Seek: ["-ss"], // + number
    Reconnect: ["-reconnect", 1, "-reconnect_delay_max", 0, "-reconnect_streamed", 1],
    Compress: ["-compression_level", 10],
    DecoderPreset: ["-preset", "ultrafast", "-tune", "fastdecode", "-ar", 48e3, "-ac", 2],
    Other: ["-analyzeduration", 0, "-loglevel", 0],
    Filters: {
        NightCore: "asetrate=48000*1.25,aresample=48000,bass=g=5",
        Karaoke: "stereotools=mlev=0.1",
        Echo: "aecho=0.8:0.9:1000:0.3",
        _3D: "apulsator=hz=0.125",
        Speed: "atempo=", // + number
        bassboost: "bass=g=", // + number
        Sub_boost: "asubboost",
        vibro: "vibrato=f=6.5",
        phaser: "aphaser=in_gain=0.4",
        vaporwave : "asetrate=48000*0.8,aresample=48000,atempo=1.1"
    }
};

type AudioFilters = Queue['audioFilters'] & {seek: number};
type FFmpegArgs = (string | number)[];


//====================== ====================== ====================== ======================
/**
 * @description Заготавливаем необходимые данные для создания потока
 */
export class FinderResource {
    protected static req: number = 0;

    public static init = async (song: Song): Promise<void> => {
        //Делаем проверку и 2 запроса
        if (!song.format?.url) {
            let format = await getLinkFormat(song);
            if (!format) format = await getLinkFormat(song);
            if (!format) {
                song.format = {url: undefined, work: false};
                delete this.req;
                return;
            }
            song.format = ConstFormat(format);
        }

        if (song.format.work) {
            delete this.req;
            return;
        }

        const resource = await new httpsClient().Request(song.format?.url, {request: {maxRedirections: 5, method: "GET"}}).catch(() => null);
        if (!resource || this.req > 3 || resource.statusCode >= 400) {
            delete song.format;
            this.req++;
            return this.init(song);
        }

        delete this.req;
        song.format.work = true;
        return;
    }
}
//Получаем InputFormat
async function getLinkFormat({type, url, title, author}: Song): Promise<InputFormat> {
    try {
        if (type === "SPOTIFY") return FindTrack(`${author.title} - ${title}`);
        else if (type === "VK") return (await new VK().getTrack(url))?.format;
        return getFormatYouTube(url);
    } catch {
        console.log('[Streamer]: [Fail: getLinkFormat]: [ReSearch]');
        return null;
    }
}
//Ищем трек на youtube
async function FindTrack(nameSong: string): Promise<InputFormat> {
    const Song: string = await YouTube.SearchVideos(nameSong, {onlyLink: true}) as string;
    if (Song) return getFormatYouTube(Song);
    return null;
}
async function getFormatYouTube(url: string): Promise<InputFormat> {
    return YouTube.getVideo(url, {onlyFormats: true});
}
//====================== ====================== ====================== ======================

/**
 * @description Подготавливаем, получаем и создаем объект схожий с discord.js {AudioResource}
 */
export class FFmpegStream {
    public readonly playStream: opus.OggDemuxer;
    public playbackDuration = 0;
    public started = false;
    public readonly silencePaddingFrames: number = 0;
    public silenceRemaining = -1;
    protected readonly FFmpeg: FFmpeg;
    protected readonly opusEncoder = new opus.OggDemuxer({autoDestroy: true});

    public get readable() {
        if (this.silenceRemaining === 0) return false;
        const read = this.playStream.readable;
        if (!read) {
            if (this.silenceRemaining === -1) this.silenceRemaining = this.silencePaddingFrames;
            return this.silenceRemaining !== 0;
        }
        return read;
    };
    public get ended() { return this.playStream?.readableEnded || this.playStream?.destroyed || !!this.playStream; };

    public constructor(url: string | any, AudioFilters: AudioFilters) {
        this.FFmpeg = new FFmpeg(CreateArguments(AudioFilters, url));

        this.playStream = this.FFmpeg.ProcessReader.pipe(this.opusEncoder);
        this.playStream.once('readable', async () => (this.started = true));
        ['end', 'close', 'error'].map((event) => this.playStream.once(event, this.destroy));
        return;
    };
    //Использует Discord.js player
    public read(): Buffer | null {
        if (this.silenceRemaining === 0) return null;
        else if (this.silenceRemaining > 0) {
            this.silenceRemaining--;
            return SILENCE_FRAME;
        }
        const packet = this.playStream.read() as Buffer | null;
        if (packet) this.playbackDuration += 20;
        return packet;
    };
    //Чистим память!
    public destroy = async (): Promise<void> => {
        this.FFmpeg.destroy();

        //Delete other
        delete this.playbackDuration;
        delete this.started;
        delete this.silenceRemaining;

        //Cleanup playStream
        this.playStream.destroy();
        this.playStream.read();

        //Cleanup opusEncoder
        this.opusEncoder.destroy();
        this.opusEncoder.read();

        return;
    };
}
//Создаем аргументы для FFmpeg
function CreateArguments (AudioFilters: AudioFilters, url: string): FFmpegArgs {
    return [
        ...FFmpegArguments.Reconnect, ...FFmpegArguments.Seek, AudioFilters?.seek ?? 0,
        '-i', url, ...FFmpegArguments.Other, "-vn",
        ...CreateFilters(AudioFilters), ...FFmpegArguments.OggOpus, ...FFmpegArguments.Compress, ...FFmpegArguments.DecoderPreset, 'pipe:'
    ];
}
//Создаем фильтры для FFmpeg
function CreateFilters(AudioFilters: AudioFilters): FFmpegArgs  {
    if (!AudioFilters) return [];

    let resp: string[] = [], resSt = '', num = 0;

    if (AudioFilters._3D) resp = [...resp, FFmpegArguments.Filters._3D];
    if (AudioFilters.speed) resp = [...resp, `${FFmpegArguments.Filters.Speed}${AudioFilters.speed}`];
    if (AudioFilters.karaoke) resp = [...resp, FFmpegArguments.Filters.Karaoke];
    if (AudioFilters.echo) resp = [...resp, FFmpegArguments.Filters.Echo];

    if (AudioFilters.nightcore) resp = [...resp, FFmpegArguments.Filters.NightCore];
    if (AudioFilters.Vw) resp = [...resp, FFmpegArguments.Filters.vaporwave];

    if (AudioFilters.bass) resp = [...resp, `${FFmpegArguments.Filters.bassboost}${AudioFilters.bass}`];
    if (AudioFilters.Sab_bass) resp = [...resp, FFmpegArguments.Filters.Sub_boost];

    for (let i in resp) {
        if (num === resp.length) resSt += `${resp[i]}`;
        resSt += `${resp[i]},`;
        num++;
    }

    return resSt === '' ? [] : ['-af', resp] as any;
}
//====================== ====================== ====================== ======================


//Запускаем FFmpeg для дальнейшего применения
class FFmpeg extends Duplex {
    public get ProcessReader() { return this.process.stdout; };
    public get ProcessWriter() { return this.process.stdin; };
    protected process: ChildProcess.ChildProcessWithoutNullStreams & {stdout: {_readableState: Readable}, stdin: {_writableState: Writable}};

    public constructor(options: FFmpegArgs) {
        super({ autoDestroy: true});
        this.process = SpawnFFmpeg(options);

        this.createEvents(['write', 'end'], this.ProcessWriter);
        this.createEvents(['read', 'setEncoding', 'pipe', 'unpipe'], this.ProcessReader);

        const processError = async (error: Error) => this.emit('error', error);
        this.ProcessReader.once('error', processError);
        this.ProcessWriter.once('error', processError);
    };
    // @ts-ignore
    protected createEvents = (methods: string[], target: Writable | Readable) => methods.map((method) => this[method] = target[method].bind(target));
    public _destroy = (): void => {
        if (this.process) {
            this.process.kill('SIGKILL');
            delete this.process;
        }
        return;
    };
}
function SpawnFFmpeg(options: FFmpegArgs): any {
    return ChildProcess.spawn(FFmpegName, options as string[], { shell: false });
}