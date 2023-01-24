"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cetus = void 0;
const Command_1 = require("@Structures/Handle/Command");
const _httpsClient_1 = require("@httpsClient");
const discord_js_1 = require("discord.js");
const CetusCycle = "https://api.warframestat.us/pc/cetusCycle";
const CetusDay = "https://media.discordapp.net/attachments/850775689107865641/996406014192668712/CetusSplashScreen.webp";
const CetusNight = "https://media.discordapp.net/attachments/850775689107865641/996406014498848828/Warframe.jpg";
class Cetus extends Command_1.Command {
    constructor() {
        super({
            name: "cetus",
            description: "Сколько щас времени на равнинах цетуса!",
            isSlash: true,
            isEnable: true,
            isGuild: false
        });
    }
    ;
    run = async (_) => {
        const result = await _httpsClient_1.httpsClient.parseJson(CetusCycle);
        return { embed: this.EmbedChange(result) };
    };
    EmbedChange = (res) => {
        if (res.isDay)
            return {
                color: discord_js_1.Colors.Yellow,
                description: `Сейчас на Цетусе день. До ночи осталось: ${res.timeLeft}`,
                image: { url: CetusDay }
            };
        return {
            color: discord_js_1.Colors.Default,
            description: `Сейчас на Цетусе ночь. До дня осталось: ${res.timeLeft}`,
            image: { url: CetusNight }
        };
    };
}
exports.Cetus = Cetus;
