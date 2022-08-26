import {Command} from "../Structures/Command";
import {readdirSync} from "node:fs";
import {WatKLOK} from "./Client/Client";
import {Module} from "../Structures/Module";
import {Event} from "../Structures/Event";

type FileSystemSupport = Command | Event<any, any> | Module;
type FileSystemCallback = { dir: string, file: string, reason: string };

let FileBase = {
    commands: [] as string[],
    events: [] as string[],
    modules: [] as string[],
};

//Добавляем лог в Array базу
function SendLog(type: "commands" | "events" | "modules", file: string, reason?: string) {
    const Status = `Status: [${reason ? "🟥" : "🟩"}]`;
    const File = `File: [${file}]`;
    let EndStr = `${Status} | ${File}`;

    if (reason) EndStr += ` | Reason: [${reason}]`; //Если есть ошибка добавляем ее

    return FileBase[type].push(EndStr);
}

export function FileSystemLoad(client: WatKLOK): void {
    if (!client.ShardID) {
        console.clear(); //Чистим консоль

        //Отправляем логи после загрузки всех системы
        setImmediate(() => {
            Object.entries(FileBase).forEach(([key, value]) => {
                const AllLogs = value.join("\n");
                console.log(`| FileSystem... Loaded [dir: ${key}, total: ${value.length}]\n${AllLogs}\n`);
            });

            //После вывода в консоль удаляем
            delete FileBase.commands;
            delete FileBase.events;
            delete FileBase.modules;
            //

            console.log("\nProcess logs:");
        });
    }

    //Загружаем команды
    new MultiFileSystem({
        path: "Handler/Commands",
        callback: (pull: Command, {file, reason, dir}) => {
            if (reason) return SendLog("commands", `./Handler/Commands/${dir}/${file}`, reason);
            else if (!pull.name) return SendLog("commands", `./Handler/Commands/${dir}/${file}`, "Parameter name has undefined");

            client.commands.set(pull.name, pull);
            SendLog("commands", `./Handler/Commands/${dir}/${file}`);
        }
    });
    //Загружаем ивенты
    new MultiFileSystem({
        path: "Handler/Events",
        callback: (pull: Event<any, any>, {file, reason, dir}) => {
            if (reason) return SendLog("events", `./Handler/Events/${dir}/${file}`, reason);
            else if (!pull.name) return SendLog("events", `./Handler/Events/${dir}/${file}`, "Parameter name has undefined");

            client.on(pull.name, (ev: any, ev2: any) => pull.run(ev, ev2, client));
            SendLog("events", `./Handler/Events/${dir}/${file}`);
        }
    });
    //Загружаем модули
    new MultiFileSystem({
        path: "Handler/Modules",
        callback: (pull: Module, {file, reason, dir}) => {
            if (reason) return SendLog("modules", `./Handler/Modules/${dir}/${file}`, reason);

            pull.run(client);
            SendLog("modules", `./Handler/Modules/${dir}/${file}`);
        }
    });
}

class MultiFileSystem {
    private readonly path: string;
    private readonly callback: (pull: FileSystemSupport, option: FileSystemCallback) => void;

    public constructor(options: {path: string, callback: (pull: FileSystemSupport, option: FileSystemCallback) => void}) {
        this.path = options.path;
        this.callback = options.callback;

        this.readDir();
    };

    private readonly readDir = () => {
        //Смотрим что находится в папке
        readdirSync(`./src/${this.path}`).forEach(async (dir: string) => {
            if (dir.endsWith(".js") || dir.endsWith(".ts")) return;

            //Берем файлы мз папки
            const files = readdirSync(`./src/${this.path}/${dir}/`).filter((file: string) => (file.endsWith(".js") || file.endsWith(".ts")));

            for (let file of files) {
                let reason: string = null;
                const pull = await this.findExport(`../${this.path}/${dir}/${file}`);

                //Добавляем ошибки если они как таковые есть
                if (!pull) reason = "Exports length has 0";
                else if (!pull.enable) reason = "Parameter enable has false";
                else if (!pull.run) reason = "Function run has not found";

                //Если при загрузке произошла ошибка
                if (pull instanceof Error) {
                    reason = pull.message;
                }

                if ("type" in pull) pull.type = dir; //Если есть type в pull

                this.callback(pull, {dir, file, reason}); //Отправляем данные в callback
            }
        });
    };

    //Загружаем export
    private readonly findExport = async (path: string): Promise<null | FileSystemSupport> => {
        const importFile = (await import(path));
        const keysFile = Object.keys(importFile);

        if (keysFile.length <= 0) return null;

        return new importFile[keysFile[0]];
    };
}