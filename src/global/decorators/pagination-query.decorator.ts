import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { ApiQuery } from "@nestjs/swagger";

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 10;

export interface Pagination {
  page: number;
  pageSize: number;
}

export const PaginatedQuery = createParamDecorator(
  (data: unknown, context: ExecutionContext): Pagination => {
    const req = context.switchToHttp().getRequest();
    return {
      page: parseInt(req.query.page, 10) || DEFAULT_PAGE,
      pageSize: parseInt(req.query.pageSize, 10) || DEFAULT_PAGE_SIZE,
    };
  },
  [
    (target: any, key: string) => {
      ApiQuery({
        name: "page",
        schema: { default: DEFAULT_PAGE, type: "number", minimum: 1 },
        required: false,
      })(target, key, Object.getOwnPropertyDescriptor(target, key));
      ApiQuery({
        name: "pageSize",
        schema: { default: DEFAULT_PAGE_SIZE, type: "number", minimum: 1 },
        required: false,
      })(target, key, Object.getOwnPropertyDescriptor(target, key));
    },
  ],
);
