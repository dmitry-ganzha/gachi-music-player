import {spawn, ChildProcessWithoutNullStreams, spawnSync} from "child_process";
import { Duplex, Readable, Writable } from 'stream';
import {Queue} from "../Structures/Queue/Queue";

export type FFmpegArgs = (string | number)[] | string[];
export type AudioFilters = Queue['audioFilters'];

let FFmpegName: string;
let sources = ['ffmpeg', 'avconv', './FFmpeg/ffmpeg', './FFmpeg/avconv', './node_modules/ffmpeg-static/ffmpeg'];

//Аргументы для FFmpeg'a
export const FFmpegArguments = {
    OggOpus: ["-acodec", "libopus", "-f", "opus"],
    Seek: ["-ss"], // + number
    Reconnect: ["-reconnect", 1, "-reconnect_delay_max", 25, "-reconnect_streamed", 1],
    DecoderPreset: ["-ar", 48e3, "-ac", 2],
    Other: ["-analyzeduration", 0],
    Filters: {
        nightcore: "asetrate=48000*1.25,aresample=48000,bass=g=5",
        karaoke: "stereotools=mlev=0.1",
        echo: "aecho=0.8:0.9:1000:0.3",
        "3d": "apulsator=hz=0.125",
        speed: "atempo=", // + number
        bass: "bass=g=", // + number
        Sub_bass: "asubboost",
        vibro: "vibrato=f=6.5",
        phaser: "aphaser=in_gain=0.4",
        Vw : "asetrate=48000*0.8,aresample=48000,atempo=1.1", //vaporwave
        AudioFade: "afade=t=in:st=0:d=1.5" //End plying afade=t=out:st=5:d=5
    } //Not using args ["-loglevel", 1] ["-preset", "medium"] ["-tune", "fastdecode"] ["-compression_level", 10]
};

/**
 * @description При старте этого файла в параметр <FFmpegName> задаем название FFmpeg'a если он будет найден
 */
const FFmpegCheck = () => {
    for (let source of sources) {
        try {
            const result = spawnSync(source, ['-h'], {windowsHide: true});
            if (result.error) continue;
            return FFmpegName = source;
        } catch {/* Nothing */}
    }
    throw new Error('FFmpeg/avconv not found!');
};
if (FFmpegName === undefined) Promise.all([FFmpegCheck()]).catch();

/**
 * @description Создаем FFmpeg для декодирования музыки, видео или чего-то другого.
 * Это круче вашего Lavalink
 */
export class FFmpeg extends Duplex {
    protected process: ChildProcessWithoutNullStreams & { stdout: { _readableState: Readable }, stdin: { _writableState: Writable } };
    protected get Input() { return this.process.stdout; };
    protected get Output() { return this.process.stdin; };

    public constructor(args: FFmpegArgs) {
        super({highWaterMark: 12, autoDestroy: true});
        this.process = this.SpawnFFmpeg(args);

        this.Binding(['write', 'end'], this.Output);
        this.Binding(['read', 'setEncoding', 'pipe', 'unpipe'], this.Input);

        //Используется для загруски потока в ffmpeg. Неообходимо не указывать параметр -i
        if (!args.includes('-i')) this.Calling(['on', 'once', 'removeListener', 'removeListeners', 'listeners']);

        //Если есть ошибка в <input, output>, выводим!
        //const processError = (error: Error) => this.emit('error', error);
        //this.Input.once('error', processError);
        //this.Output.once('error', processError);

        this.process.once("close", () => this.destroy());
    };

    /**
     * @description Создаем "привязанные функции" (ПФ - термин из ECMAScript 6)
     * @param methods {string[]}
     * @param target {Readable | Writable}
     * @constructor
     */
    // @ts-ignore
    protected Binding = (methods: string[], target: Readable | Writable) => methods.forEach((method) => this[method] = target[method].bind(target));
    protected Calling = (methods: string[]) => {
        const EVENTS = {
            readable: this.Input,
            data: this.Input,
            end: this.Input,
            unpipe: this.Input,
            finish: this.Output,
            drain: this.Output,
        };

        // @ts-ignore
        methods.forEach((method) => this[method] = (ev, fn) => EVENTS[ev] ? EVENTS[ev][method](ev, fn) : Duplex.prototype[method].call(this, ev, fn))
    };

    /**
     * @description Удаляем все что не нужно
     * @param error {Error | null} По какой ошибке завершаем работу FFmpeg'a
     */
    public _destroy = (error?: Error | null) => {
        if (this.Input) {
            this.Input.removeAllListeners();
            this.Input.destroy();
            delete this.process.stdout;
        }

        if (this.Output) {
            this.Output.removeAllListeners();
            this.Output.destroy();
            delete this.process.stdin;
        }

        if (this.process) {
            this.removeAllListeners();
            this.process.removeAllListeners();
            this.process.kill("SIGKILL");
            delete this.process;
        }

        if (error) return console.error(error);
    };

    /**
     * @description Запускаем FFmpeg
     * @param Arguments {FFmpegArgs} Указываем аргументы для запуска
     */
    protected SpawnFFmpeg = (Arguments: FFmpegArgs): any => {
        const Args = [...Arguments, 'pipe:1'];
        if (!Args.includes('-i')) Args.unshift('-i', '-');

        return spawn(FFmpegName, Args as any, { shell: false, windowsHide: true  });
    };
}
//====================== ====================== ====================== ======================
/**
 * @description Создаем фильтры для FFmpeg
 * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 * @constructor
 */
export function CreateFilters(AudioFilters: AudioFilters): string {
    let response: string[] = [];

    if (AudioFilters) {
        Object.entries(AudioFilters).forEach(([key, value]) => {
            if (!value || value <= 0) return;

            // @ts-ignore
            let FilterKey = FFmpegArguments.Filters[key];
            if (!FilterKey) return;

            // @ts-ignore
            if (typeof value === 'number') response.push(`${FilterKey}${AudioFilters[key]}`);
            else response.push(FilterKey);
        });
    }
    response.push(FFmpegArguments.Filters.AudioFade);

    return response.join(',');
}
//====================== ====================== ====================== ======================
/**
 * @description Получение всех включенных фильтров
 * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 */
export function getEnableFilters(AudioFilters: AudioFilters): string {
    if (!AudioFilters) return null;
    let response: string[] = [];

    Object.entries(AudioFilters).forEach(([key, value]) => {
        if (!value || value <= 0) return;

        response.push(key);
    });

    return response.join(', ');
}
//====================== ====================== ====================== ======================

export interface FFmpegFilters {
    nightcore?: boolean;
    karaoke?: boolean;
    echo?: boolean;
    "3d"?: boolean;
    speed?: number;
    bass?: number;
    Sub_bass?: boolean;
    vibro?: boolean;
    phaser?: boolean;
    Vw?: boolean;
    AudioFade?: boolean
}