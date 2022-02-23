import {wClient} from "../../Core/Utils/TypesHelper";

export class ConvertedText {
    public readonly enable: boolean = true;

    public run = (client: wClient): (text: string, value: any, clearText?: boolean) => string => client.ConvertedText = (text: string, value: number | any, clearText: boolean = false): string => {
        try {
            if (clearText) text = text.replace('[', '').replace(']', '').replace(/`/, '');
            if (text.length > value && value !== false) {
                return `${text.substring(0, value)}...`;
            } else return text;
        } catch {
            return text;
        }
    };
}