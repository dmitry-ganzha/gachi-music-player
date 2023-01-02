import {ChildProcessWithoutNullStreams, spawn, spawnSync} from "child_process";
import {Duplex, DuplexOptions, Readable, Writable} from "stream";
import AudioFilters from "@db/Filters.json";
import {consoleTime} from "@Client/Client";
import {dependencies} from "package.json";
import {Debug} from "@db/Config.json";

const paths = {
    ffmpeg: ["ffmpeg", "avconv"],
    ffprobe: ["ffprobe"]
}
let FFmpegName: string, FFprobeName: string;

function CheckFile(paths: string[], error: string) {
    for (let path of paths) {
        const result = spawnSync(path, ["-h"], {windowsHide: true, shell: false});
        if (result.error) continue;
        return path;
    }
    throw Error(error);
}

//Проверяем есть ли FFmpeg в системе
if (!FFmpegName) {
    try { if (Object.keys(dependencies).includes("ffmpeg-static")) paths.ffmpeg.push(require("ffmpeg-static")); } catch (e) {/* Null */}

    FFmpegName = CheckFile(paths.ffmpeg, "FFmpeg not found!");
    delete paths.ffmpeg;
}
//Проверяем есть ли FFprobe в системе
if (!FFprobeName) {
    try { if (Object.keys(dependencies).includes("ffprobe-static")) paths.ffprobe.push(require("ffprobe-static").path); } catch (e) {/* Null */}

    FFprobeName = CheckFile(paths.ffprobe, "FFprobe not found!");
    delete paths.ffprobe;
}


export namespace FFspace {
    export type Arguments = Array<string | number> | Array<string>;

    /**
     * ffmpeg is a very fast video and audio converter that can also grab from a live audio/video source. It can also convert between arbitrary sample rates and resize video on the fly with a high quality polyphase filter.
     * ffmpeg reads from an arbitrary number of input "files" (which can be regular files, pipes, network streams, grabbing devices, etc.), specified by the -i option, and writes to an arbitrary number of output "files", which are specified by a plain output url. Anything found on the command line which cannot be interpreted as an option is considered to be an output url.
     * Each input or output url can, in principle, contain any number of streams of different types (video/audio/subtitle/attachment/data). The allowed number and/or types of streams may be limited by the container format. Selecting which streams from which inputs will go into which output is either done automatically or with the -map option (see the Stream selection chapter).
     * To refer to input files in options, you must use their indices (0-based). E.g. the first input file is 0, the second is 1, etc. Similarly, streams within a file are referred to by their indices. E.g. 2:3 refers to the fourth stream in the third input file. Also see the Stream specifiers chapter.
     * As a general rule, options are applied to the next specified file. Therefore, order is important, and you can have the same option on the command line multiple times. Each occurrence is then applied to the next input or output file. Exceptions from this rule are the global options (e.g. verbosity level), which should be specified first.
     */
    export class FFmpeg extends Duplex {
        private process: ChildProcessWithoutNullStreams & { stdout: { _readableState: Readable }, stdin: { _writableState: Writable } };

        /**
         * @description Запускаем FFmpeg
         * @param args {Arguments} Аргументы запуска
         * @param options {DuplexOptions} Настройки node Stream
         */
        public constructor(args: Arguments, options: DuplexOptions = {}) {
            super({autoDestroy: true, objectMode: true, ...options});
            //Используется для загрузки потока в ffmpeg. Необходимо не указывать параметр -i
            if (!args.includes("-i")) args = ["-i", "-", ...args];

            if (Debug) consoleTime(`[Debug] -> FFmpeg: [Execute]`);

            this.process = this.SpawnFFmpeg(args);

            this.Binding(["write", "end"], this.stdin);
            this.Binding(["read", "setEncoding", "pipe", "unpipe"], this.stdout);
            this.Calling(["on", "once", "removeListener", "removeListeners", "listeners"]);
        };
        public get deletable() { return !this.process?.killed || !this.destroyed || !!this.process; };

        //====================== ====================== ====================== ======================
        /**
         * @description Выход
         * @private
         */
        public get stdout() { return this?.process?.stdout; };
        //====================== ====================== ====================== ======================
        /**
         * @description Вход
         */
        public get stdin() { return this?.process?.stdin; };
        //====================== ====================== ====================== ======================
        /**
         * @description Удаляем все что не нужно
         * @param error {Error | null} По какой ошибке завершаем работу FFmpeg'a
         */
        public readonly _destroy = (error?: Error | null) => {
            if (!super.destroyed) {
                super.destroy();
                super.read(); //Устраняем утечку памяти
            }

            this.removeAllListeners();

            if (this.deletable) {
                this.process.kill("SIGKILL");
                this.process.removeAllListeners();

                delete this.process;
            }

            if (Debug) consoleTime(`[Debug] -> FFmpeg: [Clear memory]`);
            if (error) return console.error(error);
        };
        //====================== ====================== ====================== ======================
        /**
         * @description Создаем "привязанные функции" (ПФ - термин из ECMAScript 6)
         * @param methods {string[]}
         * @param target {Readable | Writable}
         */
        // @ts-ignore
        private Binding = (methods: string[], target: Readable | Writable) => methods.forEach((method) => this[method] = target[method].bind(target));
        private Calling = (methods: string[]) => {
            const EVENTS = {
                readable: this.stdout,
                data: this.stdout,
                end: this.stdout,
                unpipe: this.stdout,
                finish: this.stdin,
                close: this.stdin,
                drain: this.stdin,
            };

            // @ts-ignore
            methods.forEach((method) => this[method] = (ev, fn) => EVENTS[ev] ? EVENTS[ev][method](ev, fn) : Duplex.prototype[method].call(this, ev, fn));
        };
        //====================== ====================== ====================== ======================
        /**
         * @description Запускаем FFmpeg
         * @param Arguments {Arguments} Указываем аргументы для запуска
         */
        private SpawnFFmpeg = (Arguments: Arguments): any => spawn(FFmpegName, [...Arguments, "pipe:1"] as any, { shell: false, windowsHide: true });
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
        private process: ChildProcessWithoutNullStreams;
        //====================== ====================== ====================== ======================
        /**
         * @description Запуск FFprobe
         * @param Arguments {Arguments} Указываем аргументы для запуска
         */
        public constructor(Arguments: Array<string>) { this.process = this.SpawnProbe(Arguments); };
        //====================== ====================== ====================== ======================
        /**
         * @description Получаем данные
         */
        public readonly getInfo = (): Promise<any> => new Promise((resolve) => {
            let information = "";
            this.process.once("close", () => {
                this.cleanup();

                return resolve(JSON.parse(information + "}"));
            });
            this.process.stdout.once("data", (data) => information += data.toString());
            this.process.once("error", this.cleanup);
        });
        //====================== ====================== ====================== ======================
        /**
         * @description Запуск FFprobe
         * @param Arguments {Arguments} Указываем аргументы для запуска
         * @private
         */
        private SpawnProbe = (Arguments: Array<string>) => spawn(FFprobeName, ["-print_format", "json", "-show_format", ...Arguments], { shell: false, windowsHide: true });

        private cleanup = () => {
            if (this.process) {
                if (!this.process?.killed) this.process.kill();
                delete this.process;
            }
        };
    }

    //Ищем Filter в Array<Filter>
    export function getFilter(name: string): Filter { return (AudioFilters as Filter[]).find((fn) => fn.names.includes(name)); }
}

interface Filter {
    names: string[];
    description: string;
    filter: string;
    args?: false | number[];
    speed?: number;
}