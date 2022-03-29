"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArraySort = void 0;
class ArraySort {
    constructor() {
        this.enable = true;
        this.run = () => {
            Object.defineProperty(Array.prototype, 'ArraySort', {
                configurable: true,
                writable: true,
                value: function (n) {
                    return Array(Math.ceil(this.length / n)).fill().map((_, i) => this.slice(i * n, i * n + n));
                }
            });
        };
    }
}
exports.ArraySort = ArraySort;
