import {ActionRowBuilder, ButtonBuilder, ButtonStyle} from "discord.js";

const Ver = "https://cdn.discordapp.com/attachments/860113484493881365/986005795038715904/Ok.png";
const NotVer = "https://cdn.discordapp.com/attachments/860113484493881365/986005794849980486/Not.png";
const NotFound = "https://cdn.discordapp.com/attachments/860113484493881365/986005794627670086/WTF.png";
const NotImage = "https://cdn.discordapp.com/attachments/860113484493881365/940926476746883082/MusciNote.png";
const Button = new ActionRowBuilder().addComponents([
    new ButtonBuilder().setCustomId("last").setEmoji({id: "986009800867479572"}).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("resume_pause").setEmoji({id: "986009725432893590"}).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("skip").setEmoji({id: "986009774015520808"}).setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId("replay").setEmoji({id: "986009690716667964"}).setStyle(ButtonStyle.Secondary)]
);

export {Ver, NotFound, NotVer, NotImage, Button};