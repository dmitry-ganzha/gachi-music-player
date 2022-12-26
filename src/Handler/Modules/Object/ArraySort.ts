import {Module} from "@Structures/Handle/Module";

export class ArraySort_ extends Module {
    public readonly isEnable: boolean = true;

    public run = (): void => {
        Object.defineProperty(Array.prototype, "ArraySort", {
            configurable: true,
            writable: true,
            value: function <V>(n: number): (V[])[] {
                // @ts-ignore
                return Array(Math.ceil(this.length / n)).fill().map((_, i) => this.slice(i * n, i * n + n))
            }
        });
    };
}

export function ArraySort<V>(number: number = 5, array: V[], callback: (value: V, index?: number) => string) {
    const pages: string[] = [];

    // @ts-ignore
    array.ArraySort(number).forEach((data: V[]) => {
        const text = data.map((value, index= 1) => callback(value, index)).join("\n");

        if (text !== undefined) pages.push(text);
    });

    return pages;
}