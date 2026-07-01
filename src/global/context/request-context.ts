import { AsyncLocalStorage } from "node:async_hooks";

/**
 * 요청 단위 컨텍스트 (AsyncLocalStorage 기반, 무의존성).
 * TraceIdMiddleware 가 요청마다 store 를 열고, 이후 로그/응답에서 traceId 를 꺼내 쓴다.
 */
export interface RequestStore {
  traceId: string;
}

const storage = new AsyncLocalStorage<RequestStore>();

export const RequestContext = {
  run<T>(store: RequestStore, callback: () => T): T {
    return storage.run(store, callback);
  },
  getTraceId(): string | undefined {
    return storage.getStore()?.traceId;
  },
};
