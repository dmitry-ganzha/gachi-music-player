import {readdirSync} from "fs";
import {Command} from "../../Commands/Constructor";
import {W_Client} from "../Utils/W_Message";

const maxLenStringDir: number = 9;

class MultiLoader {
    public name: string;
    public path: string;
    public callback: Function;

    constructor(options: any) {
        this.name = options.name;
        this.path = options.path;
        this.callback = options.callback;
    };

    /**
     * @description Открываем директорию (папку) и смотрим что в ней, проверяем что-бы были файлы js или ts. Загружаем...
     */
    public readdirSync = (): void => {
        readdirSync(this.path).forEach((dir: string) => {
            if (dir.endsWith(".js") || dir.endsWith(".ts")) return null;
            let Files = readdirSync(`${this.path}/${dir}/`).filter((d: string) => (d.endsWith('.js') || d.endsWith('.ts')));
            return this.ForLoad(Files, dir);
        });
    };
    /**
     * @description Загружаем файлы находящиеся в dir
     * @param Files {string[]} Все файлы в этой директории
     * @param dir {string} Дериктория из которой загружаем файлы
     */
    private ForLoad = async (Files: string[], dir: string): Promise<void> => {
        for (let file of Files) {
            let pull: Command;
            try {
                pull = new ((await import(`../../${this.path}/${dir}/${file}`)).default);
                pull.type = dir;
                if (!pull.enable) continue;
            } catch (e) {
                console.log(e);
                if (e) continue;
            }
            // Передаем все данные в callback для дальнейшей загрузки
            this.callback(pull, { dir: dir, file: file });
        }
    };
}

export async function Load (client: any): Promise<void> {
    new MultiLoader({
        name: 'Commands',
        path: 'Commands',
        callback: (pull: Command, op: { dir: string, file: string }): void => {
            let {dir, file} = op;
            if (pull.name) {
                client.commands.set(pull.name, pull);
                console.log(`[${AddTime()}] ->  Status: [✔️] | Type: [${FileType(file)}] | Directory: [${dir}] ${AddSpace(dir)} | NameFile: [${file}]`);
            } else {
                console.log(`[${AddTime()}] ->  Status: [✖️] | Type: [${FileType(file)}] | Directory: [${dir}] ${AddSpace(dir)} | NameFile: [${file}]`);
            }
            if (pull.aliases && Array.isArray(pull.aliases)) pull.aliases.forEach((alias: string) => client.aliases.set(alias, pull.name));
        }
    }).readdirSync();
    new MultiLoader({
        name: 'Events',
        path: 'Events',
        callback: (pull: { name: string, run (ev: Event, ev2: Event, client: W_Client): Promise<void> | void }, op: { dir: string, file: string }): void => {
            let {dir, file} = op;
            if (pull) {
                client.on(pull.name, async (f1: Event, f2: Event) => pull.run(f1, f2, client));
                console.log(`[${AddTime()}] ->  Status: [✔️] | Type: [${FileType(file)}] | Directory: [${dir}] ${AddSpace(dir)} | NameFile: [${file}]`);
            } else {
                console.log(`[${AddTime()}] ->  Status: [✖️] | Type: [${FileType(file)}] | Directory: [${dir}] ${AddSpace(dir)} | NameFile: [${file}]`);
            }
        }
    }).readdirSync();
    new MultiLoader({
        name: 'Modules',
        path: 'Modules',
        callback: (pull: {run (client: W_Client): Promise<void> | void }, op: { dir: string, file: string }): void => {
            let {dir, file} = op;
            if (pull) {
                pull.run(client);
                console.log(`[${AddTime()}] ->  Status: [✔️] | Type: [${FileType(file)}] | Directory: [${dir}] ${AddSpace(dir)} | NameFile: [${file}]`);
            } else {
                console.log(`[${AddTime()}] ->  Status: [✖️] | Type: [${FileType(file)}] | Directory: [${dir}] ${AddSpace(dir)} | NameFile: [${file}]`);
            }
        }
    }).readdirSync();
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
    return 'FileSystem';
}
//