"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Command = exports.replacer = void 0;
var replacer;
(function (replacer) {
    function replaceArray(text, srt) {
        srt.forEach((str) => text.replaceAll(str, ""));
        return text;
    }
    replacer.replaceArray = replaceArray;
    function replaceText(text, value, clearText = false) {
        try {
            if (clearText)
                text = text.replace(/[\[,\]}{"`'*]/gi, "");
            if (text.length > value && value !== false)
                return `${text.substring(0, value)}...`;
            return text;
        }
        catch {
            return text;
        }
    }
    replacer.replaceText = replaceText;
})(replacer = exports.replacer || (exports.replacer = {}));
class Command {
    constructor(options) {
        Object.keys(options).forEach((key) => {
            if (options[key] !== null)
                this[key] = options[key];
        });
    }
    ;
    run;
    name = null;
    aliases = [];
    description = "Нет описания";
    usage = "";
    permissions = { client: null, user: null };
    options = null;
    isOwner = false;
    isSlash = true;
    isGuild = true;
    isEnable = false;
    isCLD = 5;
    type;
}
exports.Command = Command;
