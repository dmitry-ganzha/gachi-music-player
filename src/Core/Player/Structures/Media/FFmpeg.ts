import {Duplex, Readable, Writable} from "stream";
import {ChildProcessWithoutNullStreams, spawn, spawnSync} from "child_process";
import JsonFFmpeg from "../../../../../DataBase/FFmpeg.json";

let FFmpegName: string, FFprobeName: string;
/**
 * Проверяем есть ли FFmpeg в системе
 */
function FFmpegCheck() {
    for (let source of JsonFFmpeg.Names) {
        try {
            const result = spawnSync(source, ["-h"], {windowsHide: true, shell: false});
            if (result.error) continue;
            return FFmpegName = source;
        } catch {/* Nothing */}
    }
    return Error("FFmpeg not found!");
}
/**
 * @description При старте этого файла в параметр <FFmpegName> задаем название FFmpeg'a и для <FFprobeName> задаем название для FFprobe, если они будут найдены!
 */
function FFprobeCheck() {
    for (let source of ["ffprobe", "./FFmpeg/ffprobe"]) {
        try {
            const result = spawnSync(source, ["-h"], {windowsHide: true, shell: false});
            if (result.error) continue;
            return FFprobeName = source;
        } catch {/* Nothing */}
    }
    return new Error("FFprobe not found!");
}
if (FFprobeName === undefined) Promise.all([FFprobeCheck()]).catch();
if (FFmpegName === undefined) Promise.all([FFmpegCheck()]).catch();


export namespace FFmpeg {
    export type Arguments = Array<string | number> | Array<string>;
    /**
     * ffmpeg is a very fast video and audio converter that can also grab from a live audio/video source. It can also convert between arbitrary sample rates and resize video on the fly with a high quality polyphase filter.
     * ffmpeg reads from an arbitrary number of input "files" (which can be regular files, pipes, network streams, grabbing devices, etc.), specified by the -i option, and writes to an arbitrary number of output "files", which are specified by a plain output url. Anything found on the command line which cannot be interpreted as an option is considered to be an output url.
     * Each input or output url can, in principle, contain any number of streams of different types (video/audio/subtitle/attachment/data). The allowed number and/or types of streams may be limited by the container format. Selecting which streams from which inputs will go into which output is either done automatically or with the -map option (see the Stream selection chapter).
     * To refer to input files in options, you must use their indices (0-based). E.g. the first input file is 0, the second is 1, etc. Similarly, streams within a file are referred to by their indices. E.g. 2:3 refers to the fourth stream in the third input file. Also see the Stream specifiers chapter.
     * As a general rule, options are applied to the next specified file. Therefore, order is important, and you can have the same option on the command line multiple times. Each occurrence is then applied to the next input or output file. Exceptions from this rule are the global options (e.g. verbosity level), which should be specified first.
     */
    export class FFmpeg extends Duplex {
        readonly _readableState: Readable;
        readonly _writableState: Writable;
        readonly #process: ChildProcessWithoutNullStreams & { stdout: { _readableState: Readable }, stdin: { _writableState: Writable } };

        public constructor(args: Arguments) {
            super({autoDestroy: true, objectMode: true});
            //Используется для загрузки потока в ffmpeg. Неообходимо не указывать параметр -i
            if (!args.includes("-i")) args = ["-i", "-", ...args];

            this.#process = this.#SpawnFFmpeg(args);
            this._readableState = this.#input._readableState;
            this._writableState = this.#output._writableState;

            this.#Binding(["write", "end"], this.#output);
            this.#Binding(["read", "setEncoding", "pipe", "unpipe"], this.#input);
            this.#Calling(["on", "once", "removeListener", "removeListeners", "listeners"]);
        };

        get #input() { return this.#process.stdout; };
        get #output() { return this.#process.stdin; };


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
         * @param Arguments {Arguments} Указываем аргументы для запуска
         */
        readonly #SpawnFFmpeg = (Arguments: Arguments): any => spawn(FFmpegName, [...Arguments, "pipe:1"] as any, { shell: false, windowsHide: true });
        //====================== ====================== ====================== ======================
        /**
         * @description Удаляем все что не нужно
         * @param error {Error | null} По какой ошибке завершаем работу FFmpeg'a
         */
        public readonly _destroy = (error?: Error | null) => {
            if (!this.#process.killed) {
                this.removeAllListeners();
                this.#process.removeAllListeners();
                this.#process.kill("SIGKILL");
            }

            if (error) return console.error(error);
        };
    }
    /**
     * ffprobe gathers information from multimedia streams and prints it in human- and machine-readable fashion.
     * For example, it can be used to check the format of the container used by a multimedia stream and the format and type of each media stream contained in it.
     * If an url is specified in input, ffprobe will try to open and probe the url content. If the url cannot be opened or recognized as a multimedia file, a positive exit code is returned.
     * ffprobe may be employed both as a standalone application or in combination with a textual filter, which may perform more sophisticated processing, e.g. statistical processing or plotting.
     * Options are used to list some formats supported by ffprobe or for specifying which information to display, and for setting how ffprobe will show it.
     * ffprobe output is designed to be easily parsable by a textual filter, and consists of one or more sections of a form defined by the selected writer, which is specified by the print_format option.
     * Sections may contain other nested sections, and are identified by a name (which may be shared by other sections), and a unique name. See the output of sections.
     * Metadata tags stored in the container or in the streams are recognized and printed in the corresponding "FORMAT", "STREAM" or "PROGRAM_STREAM" section.
     */
    export class FFprobe {
        readonly #process: ChildProcessWithoutNullStreams;
        //====================== ====================== ====================== ======================
        /**
         * @description Запуск FFprobe
         * @param Arguments {Arguments} Указываем аргументы для запуска
         */
        public constructor(Arguments: Array<string>) {
            this.#process = this.#SpawnProbe(Arguments);
        };
        //====================== ====================== ====================== ======================
        /**
         * @description Получаем данные
         */
        public readonly getInfo = (): Promise<any> => new Promise((resolve) => {
            let information = "";
            this.#process.once("close", () => {
                this.#process?.kill();
                let JsonParsed = null;

                try {
                    JsonParsed = JSON.parse(information + "}");
                } catch {/* Nothing */}

                return resolve(JsonParsed);
            });
            this.#process.stdout.once("data", (data) => information += data.toString());
            this.#process.once("error", () => this.#process?.kill());
        });
        //====================== ====================== ====================== ======================
        /**
         * @description Запуск FFprobe
         * @param Arguments {Arguments} Указываем аргументы для запуска
         * @private
         */
        readonly #SpawnProbe = (Arguments: Array<string>) => spawn(FFprobeName, ["-print_format", "json", "-show_format", ...Arguments], { shell: false, windowsHide: true });
    }
}