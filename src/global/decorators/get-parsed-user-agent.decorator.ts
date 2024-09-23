import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { CommonParsedUserAgentDto } from '../dtos/common-parsed-user-agent.dto'

export const GetParsedUserAgent = createParamDecorator(
    (data: unknown, context: ExecutionContext): CommonParsedUserAgentDto => {
        const req = context.switchToHttp().getRequest();
        const { parsedUserAgent } = req;

        return parsedUserAgent;
    },
);
