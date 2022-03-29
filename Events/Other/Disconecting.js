"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shardDisconnect = void 0;
class shardDisconnect {
    constructor() {
        this.name = 'shardDisconnect';
        this.enable = true;
        this.run = async () => console.log(`[${(new Date).toLocaleString("ru")}] [WS]: Disconnecting...`);
    }
}
exports.shardDisconnect = shardDisconnect;
