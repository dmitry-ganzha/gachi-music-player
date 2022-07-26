import {Command} from "../Constructor";
import {httpsClient} from "../../Core/httpsClient";
import {ClientMessage} from "../../Core/Client";
import {EmbedConstructor} from "../../Core/Utils/TypeHelper";
import {Colors} from "../../Core/Utils/LiteUtils";

const CetusCycle = "https://api.warframestat.us/pc/cetusCycle";
const CetusDay = "https://media.discordapp.net/attachments/850775689107865641/996406014192668712/CetusSplashScreen.webp";
const CetusNight = "https://media.discordapp.net/attachments/850775689107865641/996406014498848828/Warframe.jpg";

export default class Cetus extends Command {
    public constructor() {
        super({
            name: "cetus",
            aliases: ["цетус"],
            slash: false,
            enable: true
        });
    };

    public readonly run = (message: ClientMessage) => {
        httpsClient.parseJson(CetusCycle).then((res: CetusCycle) => {
            return res.isDay ? this.#SendMessageDay(message, res) : this.#SendMessageNight(message, res);
        });
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем сообщение о том что сейчас день
     * @param message {ClientMessage} Сообщение
     * @param res {CetusCycle} Данные о Цетусе
     * @private
     */
    readonly #SendMessageDay = (message: ClientMessage, res: CetusCycle) => {
        const EmbedDay: EmbedConstructor = {
            color: Colors.YELLOW,
            description: `Сейчас на Цетусе день. До ночи осталось: ${res.timeLeft}`,
            image: { url: CetusDay }
        };

        message.channel.send({embeds: [EmbedDay]}).then((msg) => Command.DeleteMessage(msg, 25e3)).catch(err => console.log(err));
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем сообщение о том что сейчас ночь
     * @param message {ClientMessage} Сообщение
     * @param res {CetusCycle} Данные о Цетусе
     * @private
     */
    readonly #SendMessageNight = (message: ClientMessage, res: CetusCycle) => {
        const EmbedNight: EmbedConstructor = {
            color: Colors.BLACK,
            description: `Сейчас на Цетусе ночь. До дня осталось: ${res.timeLeft}`,
            image: { url: CetusNight }
        };

        message.channel.send({embeds: [EmbedNight]}).then((msg) => Command.DeleteMessage(msg, 25e3)).catch(err => console.log(err));
    };
}

interface CetusCycle {
    id: string,
    expiry: Date,
    activation: Date,
    isDay: boolean,
    state: "day" | "night",
    timeLeft: string,
    isCetus: boolean,
    shortString: string
}