
import type { TimeMap, PromiseMap, Field, Result, RunResult, Deps } from './index.type'

export default class SfAsync<Req = any, Res = any, Params = Record<string, any>> {
  public req: Req;
  public res: Res;
  public params: Params;
  private timeMap: TimeMap<this> = new Map();
  private promiseMap: PromiseMap<this> = new Map();
  private result: Result<this> = {};
  public get deps (): Deps {
    return {};
  };

  constructor (req: Req, res: Res, params?: Params) {
    this.req = req;
    this.res = res;
    this.params = params || {} as Params;
  }

  private hrtime (field: Field<this> | '_totalTime') {
    if (this.timeMap.has(field)) {
      return;
    }
    this.timeMap.set(field, {});
    const start = Date.now();

    return () => {
      const end = Date.now();
      this.timeMap.set(field, {
        start,
        duration: end - start,
      });
    };
  }

  private async execPromise (field: Field<this>) {
    if (this.result[field]) {
      return;
    }
    if (this.promiseMap.has(field)) {
      this.result[field] = await this.promiseMap.get(field);
      return;
    }
    const endFn = this.hrtime(field);
    const p = this.serial(field);
    this.promiseMap.set(field, p);
    this.result[field] = await p;
    endFn?.();
  }

  private validDeps () {
    Object.keys(this.deps).forEach(field => {
      if (!this[field]) {
        throw new Error(`SfAsync: Invalid field in deps: ${field}`);
      }
      this.deps[field]?.forEach(depField => {
        if (!this[depField]) {
          throw new Error(`SfAsync: Invalid field in deps[${field}]: ${depField as string}`);
        }
      });
    });
  }

  private validate (fields: Field<this>[]) {
    this.validDeps();
    (fields || []).forEach(field => {
      if (!this[field]) {
        throw new Error(`SfAsync: Invalid field in classMethods: ${field as string}`);
      }
    });
  }

  private async serial (field: Field<this>) {
    const depFields = this.deps[field as string] || [];
    await this.parallel(depFields as Field<this>[]);

    const deps = depFields.reduce<Result<this>>((total, curr) => {
      total[curr] = this.result[curr];
      return total;
    }, {});
    if (typeof this[field] === 'function') {
      return await (this[field] as Function)(this.req, this.res, { deps, ...this.params });
    }
    throw new Error(`SfAsync: ${field as string} is not a function`);
  }

  private async parallel (fields: Field<this>[]) {
    const arr = fields.map(field => this.execPromise(field));
    await Promise.allSettled(arr).catch(error => {
      console.log(error);
    });
  }

  public async run (fields: Field<this>[] = []) {
    const endFn = this.hrtime('_totalTime');
    this.validate(fields);
    await this.parallel(fields);
    endFn?.();
    return this.result as RunResult<this, typeof fields[number]>;
  }
}
