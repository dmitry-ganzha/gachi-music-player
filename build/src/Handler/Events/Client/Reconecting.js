"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shardReconnecting = void 0;
const Event_1 = require("@Structures/Handle/Event");
const Client_1 = require("@Client/Client");
class shardReconnecting extends Event_1.Event {
    name = "shardReconnecting";
    isEnable = true;
    run = (_, __) => void (0, Client_1.consoleTime)("[WS]: Reconnecting...");
}
exports.shardReconnecting = shardReconnecting;
