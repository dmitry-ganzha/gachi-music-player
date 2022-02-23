import {Song} from "../Queue/Structures/Song";
import fs from "fs";

export function Directory(song: Song): {file: string} {
    const MusicID = song.id;
    const ChannelID = song.author.id;

    EnableMusicDirectory(`./db/_Audio/[${song.type}]/[${ChannelID}]/`);

    return {
        file: `./db/_Audio/[${song.type}]/[${ChannelID}]/[${MusicID}].ogg`
    };
}
export function EnableMusicDirectory(dir: string): void {
    const res = dir.split("/");
    let lol = '';

    for (let i in res) {
        lol += `${res[i]}/`;
        if (!fs.existsSync(`${lol}`)) {
            // @ts-ignore
            fs.mkdirSync(`${lol}`, (err: Error) => console.log(err));
        }
    }
}
export function DelFile(file: string): void {
    fs.unlink(file, (err) => {
        if (err) return undefined;
    });
}