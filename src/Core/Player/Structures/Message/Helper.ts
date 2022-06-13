import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from "discord.js";

const Ver = "https://cdn.discordapp.com/attachments/860113484493881365/986005795038715904/Ok.png";
const NotVer = "https://cdn.discordapp.com/attachments/860113484493881365/986005794849980486/Not.png";
const NotFound = "https://cdn.discordapp.com/attachments/860113484493881365/986005794627670086/WTF.png";
const NotImage = "https://cdn.discordapp.com/attachments/860113484493881365/940926476746883082/MusciNote.png";
const Button = new ActionRowBuilder().addComponents([
    new ButtonBuilder().setCustomId("last").setEmoji({id: "963787068264288346"}).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("resume_pause").setEmoji({id: "963787098547171438"}).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("skip").setEmoji({id: "963787083992940605"}).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("replay").setEmoji({id: "963788841603457064"}).setStyle(ButtonStyle.Secondary)]
)


export {Ver, NotFound, NotVer, NotImage, Button};