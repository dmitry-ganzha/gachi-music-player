export class CollectionMap<K, V> extends Map<K, V> {
    public get Array(): V[] | null {
        let db = [];
        for (let value of Object.values(this)) db.push(value);

        return db;
    };

    public get size(): number {
        let size = Object.keys(this).length;

        if (size > 0) return size;
        else return Object.values(this).length
    };
}