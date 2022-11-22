import {ButtonStyle, MessageReaction, User} from "discord.js";
import {ClientMessage} from "../../Handler/Events/Activity/interactiveCreate";

export namespace messageUtils {
    //Удаляем сообщение
    export function deleteMessage(message: ClientMessage, time: number = 15e3): void {
        setTimeout(() => message.deletable ? message.delete().catch(() => null) : null, time);
    }
    //Создаем сборщик сообщений
    export function createCollector(message: ClientMessage, filter: (m: ClientMessage) => boolean, max: number = 1, time: number = 20e3) {
        // @ts-ignore
        return message.channel.createMessageCollector({filter, max, time});
    }
    //Добавляем реакцию к сообщению + взаимодействие
    export function createReaction(message: ClientMessage, emoji: string, filter: (reaction: MessageReaction, user: User) => boolean, callback: (reaction: MessageReaction) => any, time = 35e3): void {
        setTimeout(() => message?.deletable ? message?.delete().catch(() => undefined) : null, time);

        message.react(emoji).then(() => message.createReactionCollector({filter, time})
            .on("collect", (reaction: MessageReaction) => callback(reaction))).catch(() => undefined);
    }
}

export namespace replacer {
    export function replaceArray(text: string, srt: string[]) {
        srt.forEach((str) => text.replace(str, ""));

        return text;
    }
}