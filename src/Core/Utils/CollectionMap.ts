export class CollectionMap<K, V> extends Map<K, V> {
    public get Array(): V[] | null {
        const db: V[] = [];
        for (let [, value] of this.entries()) db.push(value);

        return db;
    };

    public swap = (set: number = 0, next: number, path: string, K: K) => {
        // @ts-ignore
        const Array: any = this.get(K)[path];
        const hasChange = Array[next];

        Array[next] = Array[set];
        Array[set] = hasChange;
    };
}