export class CollectionMap<K, V> extends Map<K, V> {
    public get Array(): V[] | null {
        let db: V[] = [];
        for (let [key, value] of Object.entries(this)) db.push(value);

        return db;
    };
}