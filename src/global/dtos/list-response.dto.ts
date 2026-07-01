import { ResponseMeta } from "./response-meta";

export class ListResponse<T> {
  constructor(rows: T, count: number) {
    this.rows = rows;
    this.count = count;
    this.meta = new ResponseMeta();
  }
  rows: T;
  count: number;
  meta: ResponseMeta;
}
