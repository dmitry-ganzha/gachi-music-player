import {Duplex, Readable, Writable} from "stream";
import {ChildProcessWithoutNullStreams, spawn, spawnSync} from "child_process";
import JsonFFmpeg from "../../../../../DataBase/FFmpeg.json";
import {AudioFilters} from "../Queue/Queue";

export type FFmpegArgs = Array<string | number> | Array<string>;
let FFmpegName: string;
/**
 * @description
 */
const FFmpegCheck = () => {
    for (let source of JsonFFmpeg.Names) {
        try {
            const result = spawnSync(source, ["-h"], {windowsHide: true, shell: false});
            if (result.error) continue;
            return FFmpegName = source;
        } catch {/* Nothing */}
    }
    return Error("FFmpeg not found!");
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
    readonly #process: ChildProcessWithoutNullStreams & { stdout: { _readableState: Readable }, stdin: { _writableState: Writable } };
    get #input() { return this.#process.stdout; };
    get #output() { return this.#process.stdin; };

    public constructor(args: FFmpegArgs) {
        super({autoDestroy: true, objectMode: true});
        //Используется для загрузки потока в ffmpeg. Неообходимо не указывать параметр -i
        if (!args.includes("-i")) {
            args.unshift("-i", "-");
            this.#Calling(["on", "once", "removeListener", "removeListeners", "listeners"]);
        }

        this.#process = this.#SpawnFFmpeg(args);
        this.#Binding(["write", "end"], this.#output);
        this.#Binding(["read", "setEncoding", "pipe", "unpipe"], this.#input);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Создаем "привязанные функции" (ПФ - термин из ECMAScript 6)
     * @param methods {string[]}
     * @param target {Readable | Writable}
     * @constructor
     */
        // @ts-ignore
    readonly #Binding = (methods: string[], target: Readable | Writable) => methods.forEach((method) => this[method] = target[method].bind(target));
    readonly #Calling = (methods: string[]) => {
        const EVENTS = {
            readable: this.#input,
            data: this.#input,
            end: this.#input,
            unpipe: this.#input,
            finish: this.#output,
            drain: this.#output,
        };

        // @ts-ignore
        methods.forEach((method) => this[method] = (ev, fn) => EVENTS[ev] ? EVENTS[ev][method](ev, fn) : Duplex.prototype[method].call(this, ev, fn));
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Запускаем FFmpeg
     * @param Arguments {FFmpegArgs} Указываем аргументы для запуска
     */
    readonly #SpawnFFmpeg = (Arguments: FFmpegArgs): any => spawn(FFmpegName, [...Arguments, "pipe:1"] as any, { shell: false, windowsHide: true });
    //====================== ====================== ====================== ======================
    /**
     * @description Удаляем все что не нужно
     * @param error {Error | null} По какой ошибке завершаем работу FFmpeg'a
     */
    public readonly _destroy = (error?: Error | null) => {
        if (this.#process) {
            this.removeAllListeners();
            this.#process.removeAllListeners();
            this.#process.kill("SIGKILL");
        }
        super.destroy();

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
    const response: Array<string> = [];

    if (AudioFilters) AudioFilters.forEach((name: string | number) => {
        if (typeof name === "number") return;
        //@ts-ignore
        const Filter = JsonFFmpeg.FilterConfigurator[name];

        if (Filter) {
            //Если у <Filter.value> указано false (Аргументы не нужны)
            if (Filter.value === false) return response.push(Filter.arg);

            //Получаем номер фильтра
            const IndexFilter = AudioFilters.indexOf(name);
            //Добавляем в response, фильтр + аргумент
            response.push(`${Filter.arg}${AudioFilters.slice(IndexFilter + 1)[0]}`);
        }
    });

    //Более плавное включение музыки
    response.push(JsonFFmpeg.Args.Filters.AudioFade);

    return response.join(",");
}