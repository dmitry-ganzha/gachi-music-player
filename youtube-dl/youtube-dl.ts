"use strict";
import {existsSync, mkdirSync, createWriteStream} from "node:fs";
import {spawn, execFile, ChildProcessWithoutNullStreams} from 'node:child_process';
import {Readable} from "node:stream";
import {platform} from 'node:os';
import https from "node:https";
import http from "node:http";

const File = platform() === "win32" ? "youtube-dl.exe" : "youtube-dl";
const fullPath = __dirname + '/';

export class YouTubeDL {
    public getMetadata = async (options: string[] = []): Promise<any> => {
        options = [...options, "--dump-json"];

        let youtubeDlStdout = await new ClassSpawn().execFile(options);
        try {
            return JSON.parse(<string>youtubeDlStdout);
        } catch (e) {
            return JSON.parse("[" + youtubeDlStdout.replace(/\n/g, ",").slice(0, -1) + "]");
        }
    };
    public getFormats = async (options: string[]): Promise<any> => this.getMetadata([...options, ...(this._addFormat(options))]);
    public getStream = async (options: string[] = []): Promise<Readable> => {
        const readStream = new Readable({});
        options = [...options, "-o", "-"];
        const youtubeDlProcess = await new ClassSpawn().SpawnYouTubeDL(options);

        let stderrData = "", processError;
        youtubeDlProcess.stdout.on("data", (data) => readStream.push(data));
        youtubeDlProcess.stderr.on("data", (data) => stderrData += data.toString());
        youtubeDlProcess.on("error", (error) => processError = error);
        youtubeDlProcess.on("close", () => readStream.destroy());
        return readStream;
    };
    public clearRun = (options: string[] = []): Promise<any> => new ClassSpawn().execFile();
    public download = (): http.ClientRequest => new downloader().downloadFile();
    private _addFormat = (options: string[]): string[] => !options.includes("-f") && !options.includes("--format") ? ["-f", "best"] : [];
}

class downloader {
    downloadFile = (): http.ClientRequest | null => !existsSync(`${fullPath}${File}`) ? this._redirect() : null;
    private _redirect = (url: string = null): http.ClientRequest => https.get(!url ? `https://youtube-dl.org/downloads/latest/${File}` : url, (req: any) => {
        if (req.statusCode === 200) {
            if (!existsSync(`${fullPath}`)) mkdirSync(`${fullPath}`);
            return req.pipe(createWriteStream(`${fullPath}${File}`));
        }
        else if (req.statusCode === 302) return this._redirect(req.headers.location);
        else throw Error(`[YouTubeDl Installer: ${req.statusCode}]: [${req.statusMessage}]`);
    });
}
class ClassSpawn {
    SpawnYouTubeDL = async (options: string[]): Promise<ChildProcessWithoutNullStreams> => spawn(fullPath+File, options);
    execFile = async (youtubeDlArguments: string[] = []): Promise<string> => new Promise(async (resolve) => execFile(fullPath+File, youtubeDlArguments, {maxBuffer: 1024 * 1024 * 1024}, async (err: Error, out: string) => resolve(out)));
}