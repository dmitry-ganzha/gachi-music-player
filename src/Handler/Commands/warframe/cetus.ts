import {Command, messageUtils} from "../../../Structures/Handle/Command";
import {httpsClient} from "../../../Core/httpsClient";
import {ClientMessage, EmbedConstructor} from "../../Events/Activity/interactiveCreate";
import {Colors} from "discord.js";

const CetusCycle = "https://api.warframestat.us/pc/cetusCycle";
const CetusDay = "https://media.discordapp.net/attachments/850775689107865641/996406014192668712/CetusSplashScreen.webp";
const CetusNight = "https://media.discordapp.net/attachments/850775689107865641/996406014498848828/Warframe.jpg";

export default class Cetus extends Command {
    public constructor() {
        super({
            name: "cetus",
            description: "Сколько щас времени на цетусе!",
            aliases: ["цетус"],

            isSlash: true,
            isEnable: true,
            isGuild: false
        });
    };

    public readonly run = (message: ClientMessage) => {
        httpsClient.parseJson(CetusCycle).then((res: CetusCycle) => messageUtils.sendMessage({text: this.#EmbedChange(res), message}));
    };
    //====================== ====================== ====================== ======================
    /**
     * @description Отправляем сообщение о том что сейчас день
     * @param res {CetusCycle} Данные о Цетусе
     * @private
     */
    readonly #EmbedChange = (res: CetusCycle): EmbedConstructor => {
        if (res.isDay) return {
            color: Colors.Yellow,
            description: `Сейчас на Цетусе день. До ночи осталось: ${res.timeLeft}`,
            image: {url: CetusDay}
        };
        return {
            color: Colors.Default,
            description: `Сейчас на Цетусе ночь. До дня осталось: ${res.timeLeft}`,
            image: {url: CetusNight}
        };
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