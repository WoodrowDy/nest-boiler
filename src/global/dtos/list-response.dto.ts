export class ListResponse<T> {
  constructor(rows: T, count: number) {
    this.rows = rows;
    this.count = count;
  }
  rows: T;
  count: number;
}
