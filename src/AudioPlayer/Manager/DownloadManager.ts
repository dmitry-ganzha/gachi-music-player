import {Song} from "../Structures/Queue/Song";
import {helpReplace} from "../../Core/Utils/LiteUtils";
import {FileSystem} from "../../Core/FileSystem";
import fs from "fs";
import {httpsClient} from "../../Core/httpsClient";

export namespace DownloadManager {
    /**
     * @description Качаем треки и выдает ссылку на файл или значение false
     * @param song {Song} Трек
     * @param url {string} Ссылка на ресурс
     * @constructor
     */
    export function Download(song: Song, url?: string): boolean | string {
        if (song.duration.seconds >= 1000) return;

        const SongTitle = helpReplace.replaceArray(song.title, ["|", ",", "<", ">", ":", "\\", "/", "*", "?"]);
        const SongAuthor = helpReplace.replaceArray(song.author.title, ["|", ",", "<", ">", ":", "\\", "/", "*", "?"]);

        const AudioDir = `AudioCache/[${SongAuthor}]`;
        FileSystem.createDirs(AudioDir);

        //Выдаем файл если уже он скачен
        if (fs.existsSync(`${AudioDir}/[${SongTitle}].opus`)) return `${AudioDir}/[${SongTitle}].opus`;

        //Скачиваем музыку
        if (!fs.existsSync(`${AudioDir}/[${SongTitle}].raw`) && url) {
            httpsClient.Request(url).then((res) => {
                if (res.pipe) {
                    const file = fs.createWriteStream(`${AudioDir}/[${SongTitle}].raw`);

                    res.pipe(file);

                    ["close", "finish"].forEach((event) => {
                        file.once(event, () => fs.rename(`${AudioDir}/[${SongTitle}].raw`, `${AudioDir}/[${SongTitle}].opus`, () => {}))
                    })
                }
            });
        }
        return false;
    }
}