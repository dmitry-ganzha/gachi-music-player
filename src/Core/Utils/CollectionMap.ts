export class CollectionMap<K, V> extends Map<K, V> {
    public get Array(): V[] | null {
        let db: V[] = [];
        for (let [, value] of this.entries()) db.push(value);

        return db;
    };
}