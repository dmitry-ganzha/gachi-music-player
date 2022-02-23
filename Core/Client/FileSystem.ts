import {readdirSync} from "fs";
import {Command} from "../../Commands/Constructor";
import {wClient} from "../Utils/TypesHelper";
import {ClientEvents} from "discord.js";

const maxLenStringDir: number = 9;

class MultiLoader {
    protected readonly name: string;
    protected readonly path: string;
    protected readonly callback: Function;

    public constructor(options: {name: string, path: string, callback: Function}) {
        this.name = options.name;
        this.path = options.path;
        this.callback = options.callback;
    };

    /**
     * @description Открываем директорию (папку) и смотрим что в ней, проверяем что-бы были файлы js или ts. Загружаем...
     */
    public readdirSync = (): void => {
        return readdirSync(this.path).forEach((dir: string) => {
            if (dir.endsWith(".js") || dir.endsWith(".ts")) return null;

            const Files = readdirSync(`${this.path}/${dir}/`).filter((d: string) => (d.endsWith('.js') || d.endsWith('.ts')));
            return this.ForLoad(Files, dir);
        });
    };
    /**
     * @description Загружаем файлы находящиеся в dir
     * @param Files {string[]} Все файлы в этой директории
     * @param dir {string} Дериктория из которой загружаем файлы
     */
    protected ForLoad = async (Files: string[], dir: string): Promise<void> => {
        for (let file of Files) {
            let pull: Command;

            try {
                pull = await this.getFile(`../../${this.path}/${dir}/${file}`);

                pull.type = dir;

                if (!pull.enable) continue;
            } catch (e) {
                console.log(e);
                continue;
            }
            // Передаем все данные в callback для дальнейшей загрузки
            this.callback(pull, { dir: dir, file: file });
        }
    };
    protected getFile = async (path: string): Promise<Command> => {
        let cmd = (await import(path));
        let name = Object.keys(cmd)[0];
        return new cmd[name];
    }
}

export async function Load (client: wClient): Promise<void> {
    if (!client.shard) console.clear();
    new MultiLoader({
        name: 'Commands',
        path: 'Commands',
        callback: (pull: Command, op: { dir: string, file: string }): void => {
            const {dir, file} = op;

            if (pull.name) {
                client.commands.set(pull.name, pull);
                console.log(`${AddTime()} ->  Status: [✔️] | Type: [${FileType(file)}] | Path: [./Commands/${dir}/${file}]`);
            } else {
                console.log(`${AddTime()} ->  Status: [✖️] | Type: [${FileType(file)}] | Path: [./Commands/${dir}/${file}]`);
            }
            if (pull.aliases && Array.isArray(pull.aliases)) pull.aliases.forEach((alias: string) => client.aliases.set(alias, pull.name));
        }
    }).readdirSync();
    new MultiLoader({
        name: 'Events',
        path: 'Events',
        callback: (pull: { name: ClientEvents, run (ev: any, ev2: any, client: wClient): Promise<void> | void }, op: { dir: string, file: string }): void => {
            const {dir, file} = op;

            if (pull) {
                client.on(pull.name, async (ev: any, ev2: any) => pull.run(ev, ev2, client));
                console.log(`${AddTime()} ->  Status: [✔️] | Type: [${FileType(file)}] | Path: [./Events/${dir}/${file}]`);
            } else {
                console.log(`${AddTime()} ->  Status: [✖️] | Type: [${FileType(file)}] | Path: [./Events/${dir}/${file}]`);
            }
        }
    }).readdirSync();
    new MultiLoader({
        name: 'Modules',
        path: 'Modules',
        callback: (pull: {run (client: wClient): Promise<void> | void }, op: { dir: string, file: string }): void => {
            const {dir, file} = op;

            if (pull) {
                pull.run(client);
                console.log(`${AddTime()} ->  Status: [✔️] | Type: [${FileType(file)}] | Path: [./Modules/${dir}/${file}]`);
            } else {
                console.log(`${AddTime()} ->  Status: [✖️] | Type: [${FileType(file)}] | Path: [./Modules/${dir}/${file}]`);
            }
        }
    }).readdirSync();
    setImmediate(() => console.log(`----------------------------> [FileSystem Ending loading] <----------------------------`));
}

//
function FileType(file: string): string {
    return file.endsWith('.ts') ? `TS` : `JS`;
}
function AddSpace(dir: string): string {
    let textSize: number = dir.length;
    return textSize < maxLenStringDir ? (' ').repeat(maxLenStringDir - textSize) : '';
}
function AddTime(): string {
    return `[FileSystem]`;
}
//