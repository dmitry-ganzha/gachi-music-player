export class ConvertedText {
    public run = (text: string, value: number | any, clearText: boolean = false): string => {
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