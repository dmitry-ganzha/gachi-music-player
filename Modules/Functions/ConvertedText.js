"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConvertedText = void 0;
class ConvertedText {
    constructor() {
        this.enable = true;
        this.run = (client) => client.ConvertedText = (text, value, clearText = false) => {
            try {
                if (clearText)
                    text = text.replace('[', '').replace(']', '').replace(/`/, '');
                if (text.length > value && value !== false) {
                    return `${text.substring(0, value)}...`;
                }
                else
                    return text;
            }
            catch {
                return text;
            }
        };
    }
}
exports.ConvertedText = ConvertedText;
