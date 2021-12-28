import {W_Message} from "../../Core/Utils/W_Message";

export default class ConvertedText {
    public readonly enable: boolean;
    constructor() {
        this.enable = true;
    };
    public run = (client: W_Message["client"]): (text: string, value: any, clearText?: boolean) => string => client.ConvertedText = (text: string, value: number | any, clearText: boolean = false): string => {
        try {
            if (clearText) text = text.replace('[', '').replace(']', '');
            if (text.length > value && value !== false) {
                return `${text.substring(0, value)}...`;
            } else return text;
        } catch (e) {
            return text;
        }
    };
}