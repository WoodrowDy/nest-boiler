import { Request } from 'express';
import parser from 'ua-parser-js';
import MobileDetect from 'mobile-detect';
import { getClientIp } from 'request-ip';
import { get } from 'lodash';
import { lookup } from 'geoip-country';
import { ConnectionType } from '../enums/common.enums';
import { CommonParsedUserAgentDto } from '../dtos/common-parsed-user-agent.dto';

export const requestLoggerHelper = function (
    req: Request,
    loggingContext?: string,
): {
    loggingMessage: string;
    loggingContext: string;
} {
    const { method, url, headers, body } = req;
    let decodedUrl = url;
    try {
        decodedUrl = decodeURI(url);
    } catch (e) {}
    const stringifiedReqBody = JSON.stringify(
        {
            reqBody: {
                ...body,
                password: body.password ? '***' : undefined,
                oldPassword: body.oldPassword ? '***' : undefined,
            },
        },
        null,
        0,
    );
    // TODO headers의 authorization을 로그 시 '***' 처리할 지 고민 중
    const stringifiedReqHeaders = JSON.stringify(
        { reqHeaders: headers },
        null,
        0,
    );
    const parsedUserAgent = userAgentParser(req);
    const stringifiedParsedUserAgent = JSON.stringify(
        { parsedUserAgent },
        null,
        0,
    );
    req['parsedUserAgent'] = parsedUserAgent;

    const loggingMessage = `[${method}]${decodedUrl} | ${stringifiedReqBody} | ${stringifiedReqHeaders} | ${stringifiedParsedUserAgent}`;
    loggingContext = loggingContext || 'HTTP REQ';

    return { loggingMessage, loggingContext };
};

export const responseLoggerHelper = function (
    req: Request,
    resData: unknown,
    statusCode: number,
    loggingContext?: string,
): {
    loggingMessage: string;
    loggingContext: string;
} {
    const { method, url, headers, body } = req;
    let decodedUrl = url;
    try {
        decodedUrl = decodeURI(url);
    } catch (e) {}
    const stringifiedReqBody = JSON.stringify(
        {
            reqBody: {
                ...body,
                password: body.password ? '***' : undefined,
                oldPassword: body.oldPassword ? '***' : undefined,
            },
        },
        null,
        0,
    );

    const stringifiedReqHeaders = JSON.stringify(
        { reqHeaders: headers },
        null,
        0,
    );
    const stringifiedResData = JSON.stringify({ resData }, null, 0);
    const stringifiedParsedUserAgent = JSON.stringify(
        { parsedUserAgent: userAgentParser(req) },
        null,
        0,
    );

    const loggingMessage = `[${method}]${decodedUrl} | ${stringifiedResData} | ${stringifiedReqBody} | ${stringifiedReqHeaders} | ${stringifiedParsedUserAgent}`;
    loggingContext = loggingContext || `HTTP RES ${statusCode}`;

    return { loggingMessage, loggingContext };
};

export const userAgentParser = function (
    req: Request,
): CommonParsedUserAgentDto {
    const userAgent = req.headers['user-agent'];
    const parsedUserAgent = parser(userAgent);
    const mobileDetect = new MobileDetect(userAgent);

    const ip = getClientIp(req) || null;
    const country = get(lookup(ip), 'country') || null;
    const os = get(parsedUserAgent, 'os.name') || null;
    const osVersion = get(parsedUserAgent, 'os.version') || null;
    const browser = get(parsedUserAgent, 'browser.name') || null;
    const connectionType = mobileDetect.mobile()
        ? ConnectionType.MOBILE
        : mobileDetect.phone()
            ? ConnectionType.PHONE
            : mobileDetect.tablet()
                ? ConnectionType.TABLET
                : ConnectionType.WEB;
    const device =
        [
            get(parsedUserAgent, 'device.vendor'),
            get(parsedUserAgent, 'device.model'),
            get(parsedUserAgent, 'device.type'),
        ]
            .filter((el) => el === 0 || !!el)
            .join(' ') || null;
    const engine = get(parsedUserAgent, 'engine.name') || null;
    const cpu = get(parsedUserAgent, 'cpu.architecture') || null;

    return {
        ip,
        country,
        os,
        osVersion,
        browser,
        connectionType,
        device,
        engine,
        cpu,
    };
};
