"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.shardReconnecting = void 0;
class shardReconnecting {
    constructor() {
        this.name = 'shardReconnecting';
        this.enable = true;
        this.run = async () => console.log(`[${(new Date).toLocaleString("ru")}] [WS]: Reconnecting...`);
    }
}
exports.shardReconnecting = shardReconnecting;
