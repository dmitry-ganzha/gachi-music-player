export function ArraySort<V>(number: number = 5, array: V[], callback: (value: V, index?: number) => string) {
    const pages: string[] = [];

    // @ts-ignore
    Array(Math.ceil(array.length / number)).fill().map((_, i) => array.slice(i * number, i * number + number)).forEach((data: V[]) => {
        const text = data.map((value, index) => callback(value, index)).join("\n\n");

        if (text !== undefined) pages.push(text);
    });

    return pages;
}