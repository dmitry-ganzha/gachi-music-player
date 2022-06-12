import {ChildProcessWithoutNullStreams, spawn, spawnSync} from "child_process";

let FFprobeName: string
/**
 * @description При старте этого файла в параметр <FFmpegName> задаем название FFmpeg'a и для <FFprobeName> задаем название для FFprobe, если они будут найдены!
 */
const FFprobeCheck = () => {
    for (let source of ["ffprobe"]) {
        try {
            const result = spawnSync(source, ["-h"], {windowsHide: true, shell: false});
            if (result.error) continue;
            return FFprobeName = source;
        } catch {/* Nothing */}
    }
    throw new Error("FFprobe not found!");
};
if (FFprobeName === undefined) Promise.all([FFprobeCheck()]).catch();


/**
 * ffprobe gathers information from multimedia streams and prints it in human- and machine-readable fashion.
 * For example, it can be used to check the format of the container used by a multimedia stream and the format and type of each media stream contained in it.
 * If an url is specified in input, ffprobe will try to open and probe the url content. If the url cannot be opened or recognized as a multimedia file, a positive exit code is returned.
 * ffprobe may be employed both as a standalone application or in combination with a textual filter, which may perform more sophisticated processing, e.g. statistical processing or plotting.
 * Options are used to list some formats supported by ffprobe or for specifying which information to display, and for setting how ffprobe will show it.
 * ffprobe output is designed to be easily parsable by a textual filter, and consists of one or more sections of a form defined by the selected writer, which is specified by the print_format option.
 * Sections may contain other nested sections, and are identified by a name (which may be shared by other sections), and an unique name. See the output of sections.
 * Metadata tags stored in the container or in the streams are recognized and printed in the corresponding "FORMAT", "STREAM" or "PROGRAM_STREAM" section.
 */
export class FFprobe {
    #process: ChildProcessWithoutNullStreams;
    //====================== ====================== ====================== ======================
    /**
     * @description Запуск FFprobe
     * @param Arguments {FFmpegArgs} Указываем аргументы для запуска
     */
    public constructor(Arguments: string[]) {
        this.#process = this.#SpawnProbe(Arguments);
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем данные
     */
    public getInfo = (): Promise<any> => new Promise((resolve) => {
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
     * @param Arguments {FFmpegArgs} Указываем аргументы для запуска
     * @private
     */
    #SpawnProbe = (Arguments: string[]) => spawn(FFprobeName, ["-print_format", "json", "-show_format", ...Arguments], { shell: false, windowsHide: true });
}