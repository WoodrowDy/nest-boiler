import { ClassConstructor, plainToInstance } from "class-transformer";
import { ResponseMeta } from "./response-meta";

export class ObjectResponse<T> {
  constructor(row: T, type?: ClassConstructor<T>, responseCode?: string, extras?: any) {
    this.row = type ? plainToInstance(type, row) : row;
    this.responseCode = responseCode;
    this.extras = extras;
    this.meta = new ResponseMeta();
  }

  row: T;
  responseCode: string;
  extras?: any;
  meta: ResponseMeta;
}
