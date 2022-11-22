import {Module} from "../../../Structures/Module";

export class ArraySort extends Module {
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