import {DynamicPool, StaticPool} from "node-worker-threads-pool";

const Limits = {
    stackSizeMb: 14,
    codeRangeSizeMb: 7,
    maxOldGenerationSizeMb: 5,
    maxYoungGenerationSizeMb: 5
};

/**
 * @description Для выполнения более простых задач
 * @param fun {Function | Promise<Function>} Функция
 * @param options Аргументы для функции
 */
export async function StaticWorker(fun: Function | Promise<Function>, options: any[]): Promise<any> {
    const staticPool = new StaticPool({
        size: 1,
        resourceLimits: Limits,
        task: (Function) => Function
    });

    return staticPool.exec(await (await fun)(...options)).then(async (result: any) => {
        await staticPool.destroy();
        return result;
    });
}

/**
 * @description Для выполнения сложных задач
 * @param fun {Function | Promise<Function>} Функция
 * @param options Аргументы для функции
 */
export async function DynamicWorker(fun: Function | Promise<Function>, options: any[]): Promise<any> {
    const dynamicPool = new DynamicPool(1, {
        resourceLimits: Limits
    });

    return dynamicPool.exec({ task: (Function) => Function, param: await (await fun)(...options) }).then(async (result: any) => {
        await dynamicPool.destroy();
        return result;
    });
}