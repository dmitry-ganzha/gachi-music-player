import {readdirSync} from "fs";
import {ClientEvents} from "discord.js";
import {Command} from "../Commands/Constructor";
import {WatKLOK} from "./Client";

const BaseLoader = {
    total: 0,
    skip: 0,
    ok: 0,
    error: 0
}

class MultiLoader {
    protected readonly name: string;
    protected readonly path: string;
    protected readonly callback: Function;

    public constructor(options: {name: string, path: string, callback: Function}) {
        this.name = options.name;
        this.path = options.path;
        this.callback = options.callback;
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Открываем директорию (папку) и смотрим что в ней, проверяем что-бы были файлы js или ts. Загружаем...
     */
    public readonly readdirSync = async (): Promise<void> => readdirSync(`./src/${this.path}`).forEach((dir: string) => {
        if (dir.endsWith(".js") || dir.endsWith(".ts")) return;

        const Files = readdirSync(`./src/${this.path}/${dir}/`).filter((file: string) => (file.endsWith(".js") || file.endsWith(".ts")));
        return this.#ForLoad(Files, dir);
    });
    //====================== ====================== ====================== ======================
    /**
     * @description Загружаем файлы находящиеся в dir
     * @param Files {string[]} Все файлы в этой директории
     * @param dir {string} Директория из которой загружаем файлы
     * @private
     */
    readonly #ForLoad = async (Files: string[], dir: string): Promise<void> => {
        for (let file of Files) {
            let pull: Command;

            try {
                pull = await this.#getFile(`../${this.path}/${dir}/${file}`);

                pull.type = dir;
                BaseLoader.total++;

                if (!pull.enable) {
                    BaseLoader.skip++;
                    continue;
                }
            } catch (e) {
                console.log(e);
                continue;
            }
            // Передаем все данные в callback для дальнейшей загрузки
            this.callback(pull, { dir: dir, file: file });
        }
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Получаем сам класс
     * @param path {string} Путь до файла
     * @private
     */
    readonly #getFile = async (path: string): Promise<Command> => {
        const cmd = (await import(path));
        const name = Object.keys(cmd)[0];
        return new cmd[name];
    };
}

export async function FileSystemLoad (client: WatKLOK): Promise<void> {
    const ClientShard = client.ShardID !== undefined;
    if (!ClientShard) console.clear();

    await Promise.all([
        new MultiLoader({
            name: "Commands",
            path: "Commands",
            callback: (pull: Command, op: { dir: string, file: string }): void => {
                const {dir, file} = op;

                if (pull.name) {
                    client.commands.set(pull.name, pull);
                    if (!ClientShard) SendLog(file, `./Commands/${dir}/${file}`, "✔️");
                    BaseLoader.ok++;
                } else {
                    if (!ClientShard) SendLog(file, `./Commands/${dir}/${file}`, "✖️");
                    BaseLoader.error++;
                }
                if (pull.aliases && Array.isArray(pull.aliases)) pull.aliases.forEach((alias: string) => client.aliases.set(alias, pull.name));
            }
        }).readdirSync(),
        //====================== ====================== ====================== ======================
        new MultiLoader({
            name: "Events",
            path: "Events",
            callback: (pull: { name: ClientEvents, run (ev: any, ev2: any, client: WatKLOK): Promise<void> | void }, op: { dir: string, file: string }): void => {
                const {dir, file} = op;

                if (pull) {
                    client.on(pull.name as any, async (ev: any, ev2: any) => pull.run(ev, ev2, client));
                    if (!ClientShard) SendLog(file, `./Events/${dir}/${file}`, "✔️");
                    BaseLoader.ok++;
                } else {
                    if (!ClientShard) SendLog(file, `./Events/${dir}/${file}`, "✖️");
                    BaseLoader.error++;
                }
            }
        }).readdirSync(),
        //====================== ====================== ====================== ======================
        new MultiLoader({
            name: "Modules",
            path: "Modules",
            callback: (pull: {run (client: WatKLOK): Promise<void> | void }, op: { dir: string, file: string }): void => {
                const {dir, file} = op;

                if (pull) {
                    pull.run(client);
                    if (!ClientShard) SendLog(file, `./Modules/${dir}/${file}`, "✔️");
                    BaseLoader.ok++;
                } else {
                    if (!ClientShard) SendLog(file, `./Modules/${dir}/${file}`, "✖️");
                    BaseLoader.error++;
                }
            }
        }).readdirSync(),
        setImmediate(() => {
            if (!ClientShard) console.log(`[FileSystem] ->  Status: [Total: ${BaseLoader.total} | Success: ${BaseLoader.ok} | Skip: ${BaseLoader.skip} | Error: ${BaseLoader.error}]
            \n\nProcess Log:`);
        })
    ]);
}
//
function FileType(file: string): string {
    return file.endsWith(".ts") ? "TS" : "JS";
}
function NameFilesSystem(): string {
    return "[FileSystem]";
}
function SendLog(File: string, Path: string, status: "✖️" | "✔️") {
    return console.log(`${NameFilesSystem()} ->  Status: [${status}] | Type: [${FileType(File)}] | Path: [${Path}]`);
}
//