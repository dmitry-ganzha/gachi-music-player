export class ArraySort {
    public readonly enable: boolean = true;

    public run = (): void => {
        Object.defineProperty(Array.prototype, 'ArraySort', {
            configurable: true,
            writable: true,
            value: function<V>(n: number): (V[])[] {
                // @ts-ignore
                return Array(Math.ceil(this.length / n)).fill().map((_, i) => this.slice(i * n, i * n + n))
            }
        });
    };
}