"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientPlayer = void 0;
const emit_1 = require("./src/emit");
class ClientPlayer {
    constructor() {
        this.enable = true;
        this.run = (client) => client.player = new emit_1.PlayerEmitter();
    }
}
exports.ClientPlayer = ClientPlayer;
