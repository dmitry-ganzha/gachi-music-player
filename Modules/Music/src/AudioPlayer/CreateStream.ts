import {PassThrough, Transform} from 'node:stream';
import {spawn, ChildProcess} from 'node:child_process';
import {YouTube} from "../../../../Core/SPNK";
import {YouTubeDL} from "../../../../youtube-dl/youtube-dl";
import {Song} from "../Manager/Queue/Constructors/Song";
import {Queue} from "../Manager/Queue/Constructors/Queue";
import * as packageNpm from '../../../../package.json';
import {FFmpegFormat, FFmpegOptions, InputTrack} from "../../../../Core/Utils/W_Message";

const FFmpegPath: string = process.env.FFmpeg ? `${process.env.FFmpeg}` : packageNpm.dependencies["ffmpeg-static"] ? require('ffmpeg-static') : 'ffmpeg';
const SearchType: Set<string> = new Set(["SPOTIFY", "YANDEX"]);

const charCode = (x): number => x.charCodeAt(0);
const OGGs_HEADER: Buffer = Buffer.from([...'OggS'].map(charCode));
const OPUS_HEAD: Buffer = Buffer.from([...'OpusHead'].map(charCode));
const OPUS_TAGS: Buffer = Buffer.from([...'OpusTags'].map(charCode));


type encoderOptions = FFmpegOptions["encoderOptions"];

/**
 * @description Заготавливаем необходимые данные для создания потока
 */
export class CreateStream {
    public init = async (song: Song, queue: Queue, seek: number = 0): Promise<FFmpegStream> => new Promise(async (res) => {
        if (!song.format) song.format = await this.getResFormats(song);

        return res(this.getFFmpegStream(song, queue, seek));
    })
    private getFFmpegStream = async ({format}: Song, {options}: Queue, seek: number = 0): Promise<FFmpegStream> => new FFmpegStream(format, {
        encoderOptions: {
            seek: seek,
            bassboost: options.bass,
            noLossFrame: true,
            speed: options.speed
        }
    });

    private getResFormats = async ({type, url, title}: Song): Promise<FFmpegFormat | {url: undefined}> => SearchType.has(type) ? await this.getVideoYouTube(await this.SerFromYouTube(title)) : type === 'YOUTUBE' ? await this.getVideoYouTube(url) : await this.GetMetaYouTubeDL(url);
    private GetMetaYouTubeDL = async (url: string): Promise<FFmpegFormat | {url: undefined}> => new YouTubeDL().getFormats([url]).then(this.Filter);
    private SerFromYouTube = async (nameSong: string): Promise<string> => new YouTube().searchVideos(nameSong, {limit: 10}).then(this.FilterSearch);
    private getVideoYouTube = async (url: string): Promise<FFmpegFormat | {url: undefined}> => new YouTube().getVideo(url).then((video: InputTrack) => video?.format || {url: undefined});

    private Filter = (f: {formats: FFmpegFormat[]}): FFmpegFormat | {url: undefined} => f && f.formats ? f.formats.filter((f: FFmpegFormat) => f.acodec === "opus")[0] : {url: undefined};
    private FilterSearch = (f): string | null => f?.length ? f[0].url : null;
}
/**
 * @description Создаем FFmpeg, получаем ресурс
 */
class FFmpegStream extends PassThrough {
    private url: string;
    private isM3u8: boolean;
    private FFmpeg: FFmpeg;
    constructor({url, protocol, other}: FFmpegFormat, {encoderOptions}: FFmpegOptions) {
        super(Object.assign({autoDestroy: true, readableObjectMode: true, highWaterMark: 1 << 25}));
        this.url = url;
        this.isM3u8 = !!other || !!protocol?.match(/m3u8/);
        this.FFmpeg = new FFmpeg(this.constArg(encoderOptions) as string[]);

        return this.FFmpeg.pipe(this);
    };
    private constArg = (encoderOptions: encoderOptions): (string | number)[] => ["-reconnect", 1, "-reconnect_delay_max", 0, "-reconnect_streamed", 1,
        ...this._seek(encoderOptions), '-i', this.url, "-analyzeduration", 0, "-loglevel", 0,
        ...this._SpeedSong(encoderOptions), ...this._m3u8(), ...this._bassboost(encoderOptions), ...this._noLossFrame(encoderOptions), ...this._OggOpusCodec()
    ];
    private _m3u8 = (): string[] => this.isM3u8 ? ["-vn"]: [];
    private _bassboost = ({bassboost}: encoderOptions): string[] => bassboost ? ["-af", `bass=g=${bassboost}`] : [];
    private _SpeedSong = ({speed}: encoderOptions) => speed > 0 ? ["-af", `atempo=${speed}`] : []
    private _noLossFrame = ({noLossFrame}: encoderOptions): (string | number)[] => noLossFrame || this.isM3u8 ? ["-crf", 0, "-qscale", 1 << 25] : [];
    private _seek = ({seek}: encoderOptions): (string | number)[] => seek > 0 ? ['-ss', seek] : [];
    private _OggOpusCodec = (): (string | number)[] => ["-compression_level", 10, "-c:a", "libopus", "-f", "opus", "-ar", 48e3, "-ac", 2, "-preset", "ultrafast"];
    _destroy = (): void => (this.FFmpeg.destroy(), delete this.FFmpeg, delete this.url, delete this.isM3u8, this.destroy());
}

/**
 * @description Создает FFmpeg, ключевая часть музыки
 */
class FFmpeg extends Transform {
    public process: ChildProcess;
    private _bitstream: number;
    private _head: Buffer;

    constructor(args: string[]) {
        super({autoDestroy: true, readableHighWaterMark: 25, writableHighWaterMark: 30});
        this.process = spawn(`${FFmpegPath}`, [...args, "pipe:1"]);
        this._bitstream = null;
        this._head = null;

        return this.process.stdout.pipe(this);
    }
    _transform = (chunk: Buffer, encoding: BufferEncoding, done: Function): Transformer => {
        while (chunk) {
            let res = this._readPage(chunk);
            if (!res) break;
            chunk = res;
        }
        return done();
    };
    private _readPage = (chunk: Buffer): false | Buffer  => {
        if (this._checkReadPage(chunk)) return false;
        const pageSegments = chunk.readUInt8(26);
        this._chunkSeg(chunk, pageSegments);

        let sizes: number[] = [], totalSize = 0;
        this._forPageSegments(sizes, pageSegments, totalSize, chunk);
        this._chunkTotal(chunk, pageSegments, totalSize);
        return this._readPageEnd(chunk, pageSegments, sizes);
    };
    private _readPageEnd = (chunk: Buffer, pageSegments: number, sizes: number[]): Buffer => {
        const bitstream = chunk.readUInt32BE(14);

        let start = 27 + pageSegments;
        for (let size of sizes) {
            let segment = chunk.slice(start, start + size);
            let header = segment.slice(0, 8);

            this._TrSizeOfSizes(bitstream, segment, header);
            start += size;
        }

        return chunk.slice(start);
    };
    private _forPageSegments = (sizes: number[], pageSegments: number, totalSize: number, chunk: Buffer): boolean => {
        const table = chunk.slice(27, 27 + pageSegments);
        for (let i = 0; i < pageSegments;) {
            let size = 0, x = 255;
            while (x === 255) {
                if (i >= table.length) return false;
                x = table.readUInt8(i);
                i++;
                size += x;
            }
            sizes.push(size);
            totalSize += size;
        }
        return null;
    };
    private _chunkTotal = (chunk: Buffer, pageSegments: number, totalSize: number): false | null => chunk.length < 27 + pageSegments + totalSize ? false : null;
    private _chunkSeg = (chunk: Buffer, pageSegments: number): false | null => chunk.length < 27 + pageSegments ? false : null;
    private _checkReadPage = (chunk: Buffer): Error | boolean => chunk.length < 26 ? true : !chunk.slice(0, 4).equals(OGGs_HEADER) ? Error(`capture_pattern is not ${OGGs_HEADER}`) : this._checkReadPageNext(chunk);
    private _checkReadPageNext = (chunk: Buffer): Error | boolean => chunk.readUInt8(4) !== 0 ? Error(`stream_structure_version is not ${0}`) : chunk.length < 27;
    private _TrSizeOfSizes = (bitstream: number, segment: Buffer, header: Buffer): any => this._head ? (header.equals(OPUS_TAGS) ? this.emit('tags', segment) : this._bitstream === bitstream ? this.push(segment) : null) : header.equals(OPUS_HEAD) ? (this.emit('head'), segment, this._head = segment, this._bitstream = bitstream) : this.emit('unknownSegment', segment);
    _final = (): void => this.destroy();
    _destroy = (): void => (this.process.kill(), delete this.process, delete this._head, delete this._bitstream, this.destroy());
}


/*
        if (song.format?.url && !song.format?.work && cfg.Player.https) {
            https.get(song.format?.url, async (resource: IncomingMessage) => {
                console.log(`[${(new Date).toLocaleString("ru")}] [HTTPS]: [CODE: ${resource.statusCode}]: [Message: ${resource.statusMessage}]`);
                if (resource.statusCode >= 400 && resource.statusCode <= 500 && this.req <= 3) {
                    delete song.format;
                    this.req++;
                    return res(this.init(song, queue, seek));
                }
                resource.destroy();
                delete this.req;
                song.format.work = true;
                return res(this.getFFmpegStream(song, queue, seek));
            })
        } else {
            delete this.req;
            return res(this.getFFmpegStream(song, queue, seek));
        }
 */