import {Command} from "../Constructor";
import {W_Message} from "../../Core/Utils/W_Message";

export default class CommandSearch extends Command {
    constructor() {
        super({
            name: "search",
            aliases: ["searh", "поиск", "seh"],
            description: "Поиск музыки на youtube",

            permissions: {
                client: ['SPEAK', 'CONNECT'],
                user: null
            },

            enable: true
        })
    }

    run = async (message: W_Message): Promise<void> => message.client.Send({text: `${message.author}, ⚠ Эта команда была внесена в команду play.`, message: message, color: 'GREEN'});
}