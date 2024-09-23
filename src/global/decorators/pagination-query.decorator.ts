import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiQuery } from '@nestjs/swagger';
import { commonConstants } from '../constants/common.constants';

const { PAGE, PAGE_SIZE, MAX_PAGE_SIZE } = commonConstants.defaultQuery;
export interface Pagination {
    page: number;
    pageSize: number;
}

export const PaginationQuery = createParamDecorator(
    (data: unknown, context: ExecutionContext): Pagination => {
        const req = context.switchToHttp().getRequest();
        const page = parseInt(req.query.page, 10) || PAGE;
        const pageSize = parseInt(req.query.pageSize, 10) || PAGE_SIZE;

        return {
            page,
            pageSize: Math.min(pageSize, MAX_PAGE_SIZE),
        };
    },
    [
        (target: any, key: string) => {
            ApiQuery({
                name: 'page',
                schema: { default: PAGE, type: 'number', minimum: 1 },
                required: false,
            })(target, key, Object.getOwnPropertyDescriptor(target, key));
            ApiQuery({
                name: 'pageSize',
                schema: { default: PAGE_SIZE, type: 'number', minimum: 1 },
                required: false,
            })(target, key, Object.getOwnPropertyDescriptor(target, key));
        },
    ],
);
