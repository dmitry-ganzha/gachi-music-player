import {spawn, ChildProcessWithoutNullStreams, spawnSync} from "child_process";
import { Duplex, Readable, Writable } from 'stream';
import {Queue} from "../Structures/Queue/Queue";
import FFmpegConfiguration from "../../../../DataBase/FFmpeg.json";

export type FFmpegArgs = (string | number)[] | string[];
export type AudioFilters = Queue['audioFilters'];

let FFmpegName: string;

/**
 * @description При старте этого файла в параметр <FFmpegName> задаем название FFmpeg'a если он будет найден
 */
const FFmpegCheck = () => {
    for (let source of FFmpegConfiguration.Names) {
        try {
            const result = spawnSync(source, ['-h'], {windowsHide: true, shell: false});
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
    };
    //====================== ====================== ====================== ======================
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
    //====================== ====================== ====================== ======================
    /**
     * @description Запускаем FFmpeg
     * @param Arguments {FFmpegArgs} Указываем аргументы для запуска
     */
    protected SpawnFFmpeg = (Arguments: FFmpegArgs): any => {
        const Args = [...Arguments, 'pipe:1'];
        if (!Args.includes('-i')) Args.unshift('-i', '-');

        return spawn(FFmpegName, Args as any, { shell: false, windowsHide: true  });
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем все что не нужно
     * @param error {Error | null} По какой ошибке завершаем работу FFmpeg'a
     */
    public _destroy = (error?: Error | null) => {
        if (this.process) {
            this.removeAllListeners();
            this.process.removeAllListeners();
            this.process.kill("SIGKILL");
            delete this.process;
        }

        if (error) return console.error(error);
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
        AudioFilters.forEach((name: string) => {
            if (typeof name === 'number') return;

            // @ts-ignore
            const Filter = FFmpegConfiguration.FilterConfigurator[name];
            if (!Filter) return;

            if (Filter.value === false) {
                response.push(Filter.arg);
                return;
            }
            const index = AudioFilters.indexOf(name);
            if (index === -1) return;

            response.push(`${Filter.arg}${AudioFilters.slice(index + 1)[0]}`);
            return;
        });
    }
    response.push(FFmpegConfiguration.Args.Filters.AudioFade);

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

    AudioFilters.forEach((name: string) => {
        if (typeof name === 'number') return;
        response.push(name);
    });

    return response.join(', ');
}