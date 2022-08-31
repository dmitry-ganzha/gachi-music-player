import fs from "fs";

type SupportLanguages = "rus" | "eng"
type ReplaceText = {};
const DefPath = '../DataBase/languages';

export function getTranslate(path: string, replaced?: ReplaceText, lang: SupportLanguages = "rus"): string {
    if (!fs.existsSync(`${DefPath}/${lang}.json`)) return `Not found file!`;

    const fundPath = require(`../${DefPath}/${lang}.json`);
    const splPath = path.split(".");
    let findText: string;

    splPath.forEach((pt) => findText = Object.values(fundPath[pt as any]).pop() as string);

    if (findText === path) return path;
    if (replaced) Object.entries(replaced).forEach(([key, value]) => findText = findText.replace(key, value as string));

    return findText;
}