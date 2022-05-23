import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from "discord.js";
import cfg from "../../../../DataBase/Config.json";

export function getButtons(ClientID: string) {
    const Buttons = {
        MyUrl: new ButtonBuilder().setURL(`https://discord.com/oauth2/authorize?client_id=${ClientID}&permissions=8&scope=bot+applications.commands`).setEmoji({name: '🔗'}).setLabel('Invite').setStyle(ButtonStyle.Link),
        ServerUrl: new ButtonBuilder().setURL(cfg.Bot.DiscordServer).setEmoji({name: '🛡'}).setLabel('Help server').setStyle(ButtonStyle.Link),
        Git: new ButtonBuilder().setURL('https://github.com/SNIPPIK/WatKLOK-BOT').setEmoji({name: "🗂"}).setLabel("GitHub").setStyle(ButtonStyle.Link)
    };
    return new ActionRowBuilder().addComponents([Buttons.MyUrl, Buttons.ServerUrl, Buttons.Git]);
}