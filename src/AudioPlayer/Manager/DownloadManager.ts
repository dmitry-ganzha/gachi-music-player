import {Song} from "../Structures/Queue/Song";
import {replacer} from "../../Core/Utils/LiteUtils";
import {FileSystem} from "../../Core/FileSystem";
import fs from "fs";
import {httpsClient} from "../../Core/httpsClient";
import {Debug} from "../../../DataBase/Config.json";

export namespace DownloadManager {
    /**
     * @description Качаем треки и выдает ссылку на файл или значение false
     * @param song {Song} Трек
     * @param url {string} Ссылка на ресурс
     * @constructor
     */
    export function downloadUrl(song: Song, url?: string): boolean | string {
        if (song.duration.seconds >= 1000) return;

        const SongTitle = replacer.replaceArray(song.title, ["|", ",", "<", ">", ":", "\\", "/", "*", "?"]);
        const SongAuthor = replacer.replaceArray(song.author.title, ["|", ",", "<", ">", ":", "\\", "/", "*", "?"]);

        const AudioDir = `AudioCache/[${SongAuthor}]`;
        FileSystem.createDirs(AudioDir);

        //Выдаем файл если уже он скачен
        if (fs.existsSync(`${AudioDir}/[${SongTitle}].opus`)) return `${AudioDir}/[${SongTitle}].opus`;

        try {
            //Скачиваем музыку
            if (!fs.existsSync(`${AudioDir}/[${SongTitle}].raw`) && url) {
                httpsClient.Request(url).then((res) => {
                    if (res.pipe) {
                        const file = fs.createWriteStream(`${AudioDir}/[${SongTitle}].raw`);

                        res.pipe(file);

                        ["close", "finish"].forEach((event) => file.once(event, () => fs.rename(`${AudioDir}/[${SongTitle}].raw`, `${AudioDir}/[${SongTitle}].opus`, () => null)))
                    }
                });
            }
        } catch (e) {
            if (Debug) console.log(`[DownloadManager]: Fail download ${SongTitle}`);
        }
        return false;
    }
}