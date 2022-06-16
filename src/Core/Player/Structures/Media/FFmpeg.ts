import {Duplex, Readable, Writable} from "stream";
import {ChildProcessWithoutNullStreams, spawn, spawnSync} from "child_process";
import FFmpegConfiguration from "../../../../../DataBase/FFmpeg.json";
import {AudioFilters} from "../Queue/Queue";

export type FFmpegArgs = (string | number)[] | string[];
let FFmpegName: string;
/**
 * @description
 */
const FFmpegCheck = () => {
    for (let source of FFmpegConfiguration.Names) {
        try {
            const result = spawnSync(source, ["-h"], {windowsHide: true, shell: false});
            if (result.error) continue;
            return FFmpegName = source;
        } catch {/* Nothing */}
    }
    throw Error("FFmpeg not found!");
};
if (FFmpegName === undefined) Promise.all([FFmpegCheck()]).catch();


/**
 * ffmpeg is a very fast video and audio converter that can also grab from a live audio/video source. It can also convert between arbitrary sample rates and resize video on the fly with a high quality polyphase filter.
 * ffmpeg reads from an arbitrary number of input "files" (which can be regular files, pipes, network streams, grabbing devices, etc.), specified by the -i option, and writes to an arbitrary number of output "files", which are specified by a plain output url. Anything found on the command line which cannot be interpreted as an option is considered to be an output url.
 * Each input or output url can, in principle, contain any number of streams of different types (video/audio/subtitle/attachment/data). The allowed number and/or types of streams may be limited by the container format. Selecting which streams from which inputs will go into which output is either done automatically or with the -map option (see the Stream selection chapter).
 * To refer to input files in options, you must use their indices (0-based). E.g. the first input file is 0, the second is 1, etc. Similarly, streams within a file are referred to by their indices. E.g. 2:3 refers to the fourth stream in the third input file. Also see the Stream specifiers chapter.
 * As a general rule, options are applied to the next specified file. Therefore, order is important, and you can have the same option on the command line multiple times. Each occurrence is then applied to the next input or output file. Exceptions from this rule are the global options (e.g. verbosity level), which should be specified first.
 */
export class FFmpeg extends Duplex {
    #process: ChildProcessWithoutNullStreams & { stdout: { _readableState: Readable }, stdin: { _writableState: Writable } };
    get #Input() { return this.#process.stdout; };
    get #Output() { return this.#process.stdin; };
    //====================== ====================== ====================== ======================
    public constructor(args: FFmpegArgs) {
        super({autoDestroy: true, objectMode: true});
        this.#process = this.#SpawnFFmpeg(args);

        this.#Binding(["write", "end"], this.#Output);
        this.#Binding(["read", "setEncoding", "pipe", "unpipe"], this.#Input);

        //Используется для загрузки потока в ffmpeg. Неообходимо не указывать параметр -i
        if (!args.includes("-i")) this.#Calling(["on", "once", "removeListener", "removeListeners", "listeners"]);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем "привязанные функции" (ПФ - термин из ECMAScript 6)
     * @param methods {string[]}
     * @param target {Readable | Writable}
     * @constructor
     */
        // @ts-ignore
    #Binding = (methods: string[], target: Readable | Writable) => methods.forEach((method) => this[method] = target[method].bind(target));
    #Calling = (methods: string[]) => {
        const EVENTS = {
            readable: this.#Input,
            data: this.#Input,
            end: this.#Input,
            unpipe: this.#Input,
            finish: this.#Output,
            drain: this.#Output,
        };

        // @ts-ignore
        methods.forEach((method) => this[method] = (ev, fn) => EVENTS[ev] ? EVENTS[ev][method](ev, fn) : Duplex.prototype[method].call(this, ev, fn));
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Запускаем FFmpeg
     * @param Arguments {FFmpegArgs} Указываем аргументы для запуска
     */
    #SpawnFFmpeg = (Arguments: FFmpegArgs): any => {
        const Args = [...Arguments, "pipe:1"];
        if (!Args.includes("-i")) Args.unshift("-i", "-");

        return spawn(FFmpegName, Args as any, { shell: false, windowsHide: true });
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем все что не нужно
     * @param error {Error | null} По какой ошибке завершаем работу FFmpeg'a
     */
    public _destroy = (error?: Error | null) => {
        if (this.#process) {
            this.removeAllListeners();
            this.#process.removeAllListeners();
            this.#process.kill("SIGKILL");
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
    const response: string[] = [];

    if (AudioFilters) AudioFilters.forEach((name: string) => {
        if (typeof name === "number") return;

        // @ts-ignore
        const Filter = FFmpegConfiguration.FilterConfigurator[name];
        if (!Filter) return;
        if (Filter.value === false) return response.push(Filter.arg);

        const index = AudioFilters.indexOf(name);
        if (index === -1) return;

        response.push(`${Filter.arg}${AudioFilters.slice(index + 1)[0]}`);
        return;
    });

    response.push(FFmpegConfiguration.Args.Filters.AudioFade);

    return response.join(",");
}
//====================== ====================== ====================== ======================
/**
 * @description Получение всех включенных фильтров
 * @param AudioFilters {AudioFilters} Аудио фильтры которые включил пользователь
 */
export function getEnableFilters(AudioFilters: AudioFilters): string {
    if (!AudioFilters) return null;
    const response: string[] = [];

    AudioFilters.forEach((name: string) => {
        if (typeof name === "number") return;
        response.push(name);
    });

    return response.join(", ");
}