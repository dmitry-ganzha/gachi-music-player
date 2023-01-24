"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArraySort = void 0;
function ArraySort(number = 5, array, callback, joined = "\n\n") {
    const pages = [];
    Array(Math.ceil(array.length / number)).fill().map((_, i) => array.slice(i * number, i * number + number)).forEach((data) => {
        const text = data.map((value, index) => callback(value, index)).join(joined);
        if (text !== undefined)
            pages.push(text);
    });
    return pages;
}
exports.ArraySort = ArraySort;
