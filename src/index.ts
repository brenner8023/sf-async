
type TimeMap<T> = Map<keyof T | '_totalTime', Partial<{ start: number; duration: number }>>
type PromiseMap<T> = Map<keyof T, Promise<any>>
type Result<T> = Partial<Record<keyof T, any>>
type Deps<T> = Partial<Record<keyof T, (keyof T)[]>>

export default class SfAsync<Req = any, Res = any, Params = Record<string, any>> {
  private req: Req;
  private res: Res;
  private params: Params;
  private timeMap: TimeMap<this> = new Map();
  private promiseMap: PromiseMap<this> = new Map();
  private result: Result<this> = {};
  public deps: Deps<this> = {};

  constructor (req: Req, res: Res, params?: Params) {
    this.req = req;
    this.res = res;
    this.params = params || {} as Params;
  }

  private hrtime (field: keyof this | '_totalTime') {
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

  private async execPromise (field: keyof this) {
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
      this.deps[field].forEach(depField => {
        if (!this[depField]) {
          throw new Error(`SfAsync: Invalid field in deps[${field}]: ${depField}`);
        }
      });
    });
  }

  private validate (fields: (keyof this)[]) {
    this.validDeps();
    (fields || []).forEach(field => {
      if (!this[field]) {
        throw new Error(`SfAsync: Invalid field in classMethods: ${field as string}`);
      }
    });
  }

  private async serial (field: keyof this) {
    const depFields = this.deps[field] || [];
    await this.parallel(depFields);

    const deps = depFields.reduce<Record<keyof this, any>>((total, curr) => {
      total[curr] = this.result[curr];
      return total;
    }, {} as any);
    if (typeof this[field] === 'function') {
      return await (this[field] as Function)(this.req, this.res, { deps, ...this.params });
    }
    throw new Error(`SfAsync: ${field as string} is not a function`);
  }

  private async parallel (fields: (keyof this)[]) {
    const arr = fields.map(field => this.execPromise(field));
    await Promise.allSettled(arr).catch(error => {
      console.log(error);
    });
  }

  public async run (fields: (keyof this)[] = []) {
    const endFn = this.hrtime('_totalTime');
    this.validate(fields);
    await this.parallel(fields);
    endFn?.();
    return this.result;
  }
}
