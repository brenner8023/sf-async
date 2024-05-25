
export type TimeMap<T> = Map<keyof T | '_totalTime', Partial<{ start: number; duration: number }>>
export type PromiseMap<T> = Map<keyof T, Promise<any>>
export type Field<T> = Exclude<keyof T, 'deps' | 'run'>
type PromiseType<T extends Promise<any>> = T extends Promise<infer U> ? U : T;
export type Result<T> = Partial<{
  [K in Field<T>]: T[K] extends (...args) => any ? PromiseType<ReturnType<T[K]>> : unknown
}>
export type RunResult<T, P extends keyof T> = {
  [K in P]: T[K] extends (...args) => any ? PromiseType<ReturnType<T[K]>> : unknown
}
export type Deps = Partial<Record<string, string[]>>
