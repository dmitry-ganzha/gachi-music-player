"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConsoleLog = void 0;
class ConsoleLog {
    constructor() {
        this.enable = true;
        this.run = (client) => client.console = (set) => setTimeout(() => console.log(`[${(new Date).toLocaleString("ru")}] ${set}`), 25);
    }
}
exports.ConsoleLog = ConsoleLog;
