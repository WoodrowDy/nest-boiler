import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetSession = createParamDecorator(
    (data: unknown, context: ExecutionContext) => {
        const request = context.switchToHttp().getRequest();
        const { session } = request;
        return session;
    },
);
