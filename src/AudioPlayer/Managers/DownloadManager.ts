import {replacer} from "@Structures/Handle/Command";
import {Debug, Music} from "@db/Config.json";
import {httpsClient} from "@httpsClient";
import {FileSystem} from "@FileSystem";
import {Song} from "@Queue/Song";
import fs from "fs";

export namespace DownloadManager {
    /**
     * @description Качаем треки и выдает ссылку на файл или значение false
     * @param song {Song} Трек
     * @param url {string} Ссылка на ресурс
     * @constructor
     */
    export function downloadUrl(song: Song, url?: string): boolean | string {
        if (song.duration.seconds >= 1000 || song.duration.full === "Live") return;
        if (Music.CacheDir.endsWith("/")) Music.CacheDir.slice(Music.CacheDir.length - 1);

        const SongTitle = replacer.replaceArray(song.title, ["|", ",", "<", ">", ":", "\\", "/", "*", "?"]);
        const SongAuthor = replacer.replaceArray(song.author.title, ["|", ",", "<", ">", ":", "\\", "/", "*", "?"]);

        const AudioDir = `${Music.CacheDir}/[${SongAuthor}]`;
        FileSystem.createDirs(AudioDir);

        //Выдаем файл если уже он скачен
        if (fs.existsSync(`${AudioDir}/[${SongTitle}].opus`)) return `${AudioDir}/[${SongTitle}].opus`;

        try {
            //Скачиваем музыку
            if (!fs.existsSync(`${AudioDir}/[${SongTitle}].raw`) && url) {
                httpsClient.Request(url).then((res) => {
                    if (res.pipe) {
                        const file = fs.createWriteStream(`${AudioDir}/[${SongTitle}].raw`);

                        //Если файл невозможно создать
                        file.once("error", () => null);
                        file.once("ready", () => {
                            res.pipe(file);
                            ["close", "finish"].forEach((event) => file.once(event, () => fs.rename(`${AudioDir}/[${SongTitle}].raw`, `${AudioDir}/[${SongTitle}].opus`, () => null)))
                        });
                    }
                });
            }
        } catch (e) {
            if (Debug) console.log(`[DownloadManager]: Fail download ${SongTitle}`);
        }
        return false;
    }
}