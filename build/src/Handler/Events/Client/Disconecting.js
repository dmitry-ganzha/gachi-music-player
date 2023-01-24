"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shardDisconnect = void 0;
const Event_1 = require("@Structures/Handle/Event");
const Client_1 = require("@Client/Client");
class shardDisconnect extends Event_1.Event {
    name = "shardDisconnect";
    isEnable = true;
    run = (_, __) => void (0, Client_1.consoleTime)("[WS]: Disconnecting...");
}
exports.shardDisconnect = shardDisconnect;
