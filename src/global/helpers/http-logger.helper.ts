import { Request } from "express";
import parser from "ua-parser-js";
import MobileDetect from "mobile-detect";
import { getClientIp } from "request-ip";
import { get } from "lodash";
import { lookup } from "geoip-country";
import { ConnectionType } from "../enums/common.enums";
import { CommonParsedUserAgentDto } from "../dtos/common-parsed-user-agent.dto";
import { parseAuthHeader } from "./auth-header.helper";

// 로그에 남기지 않는 헤더. 허용 목록이 아니라 차단 목록이다 — 허용 목록이면
// 디버깅에 필요한 헤더가 조용히 사라진다.
const SENSITIVE_HEADERS = new Set([
  "authorization",
  // "proxy-authorization",
  // "cookie",
  // "set-cookie",
  // "x-api-key",
  // "x-auth-token",
]);

// 스킴(`Bearer`)은 비밀이 아니라 남긴다. 스킴이 없으면 앞부분이 곧 비밀이라 통째로 가린다.
const maskHeaderValue = function (key: string, value: unknown): unknown {
  if (key !== "authorization" && key !== "proxy-authorization") return "***";

  const scheme = parseAuthHeader(value)?.scheme;

  return scheme ? `${scheme} ***` : "***";
};

const maskSensitiveHeaders = function (headers: Request["headers"]): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(headers ?? {}).map(([key, value]) => {
      const name = key.toLowerCase();

      return [key, SENSITIVE_HEADERS.has(name) ? maskHeaderValue(name, value) : value];
    })
  );
};

export const requestLoggerHelper = function (
  req: Request,
  loggingContext?: string
): {
  loggingMessage: string;
  loggingContext: string;
} {
  /**
   * ★ body 에 기본값을 둔다.
   *   Express 5 부터 본문이 없는 요청(GET 등)의 req.body 는 undefined 다 — 4 는 {} 였다.
   *   그대로 두면 아래 body.password 에서 터져 모든 GET 이 500 이 된다.
   */
  const { method, url, headers, body = {} } = req;
  let decodedUrl = url;
  try {
    decodedUrl = decodeURI(url);
  } catch (error) {
    console.log(error);
  }
  const stringifiedReqBody = JSON.stringify(
    {
      reqBody: {
        ...body,
        password: body.password ? "***" : undefined,
        oldPassword: body.oldPassword ? "***" : undefined,
      },
    },
    null
  );
  const stringifiedReqHeaders = JSON.stringify(
    { reqHeaders: maskSensitiveHeaders(headers) },
    null,
    0
  );
  const parsedUserAgent = userAgentParser(req);
  const stringifiedParsedUserAgent = JSON.stringify({ parsedUserAgent }, null, 0);
  req["parsedUserAgent"] = parsedUserAgent;

  // eslint-disable-next-line max-len
  const loggingMessage = `[${method}]${decodedUrl} | ${stringifiedReqBody} | ${stringifiedReqHeaders} | ${stringifiedParsedUserAgent}`;
  loggingContext = loggingContext || "HTTP REQ";

  return { loggingMessage, loggingContext };
};

export const responseLoggerHelper = function (
  req: Request,
  resData: unknown,
  statusCode: number,
  loggingContext?: string
): {
  loggingMessage: string;
  loggingContext: string;
} {
  /**
   * ★ body 에 기본값을 둔다.
   *   Express 5 부터 본문이 없는 요청(GET 등)의 req.body 는 undefined 다 — 4 는 {} 였다.
   *   그대로 두면 아래 body.password 에서 터져 모든 GET 이 500 이 된다.
   */
  const { method, url, headers, body = {} } = req;
  let decodedUrl = url;
  try {
    decodedUrl = decodeURI(url);
  } catch (error) {
    console.log(error);
  }
  const stringifiedReqBody = JSON.stringify(
    {
      reqBody: {
        ...body,
        password: body.password ? "***" : undefined,
        oldPassword: body.oldPassword ? "***" : undefined,
      },
    },
    null,
    0
  );

  const stringifiedReqHeaders = JSON.stringify(
    { reqHeaders: maskSensitiveHeaders(headers) },
    null,
    0
  );
  const stringifiedResData = JSON.stringify({ resData }, null, 0);
  const stringifiedParsedUserAgent = JSON.stringify(
    { parsedUserAgent: userAgentParser(req) },
    null,
    0
  );

  // eslint-disable-next-line max-len
  const loggingMessage = `[${method}]${decodedUrl} | ${stringifiedResData} | ${stringifiedReqBody} | ${stringifiedReqHeaders} | ${stringifiedParsedUserAgent}`;
  loggingContext = loggingContext || `HTTP RES ${statusCode}`;

  return { loggingMessage, loggingContext };
};

export const userAgentParser = function (req: Request): CommonParsedUserAgentDto {
  const userAgent = req.headers["user-agent"];
  const parsedUserAgent = parser(userAgent);
  const mobileDetect = new MobileDetect(userAgent);

  const ip = getClientIp(req) || null;
  const country = get(lookup(ip), "country") || null;
  const os = get(parsedUserAgent, "os.name") || null;
  const osVersion = get(parsedUserAgent, "os.version") || null;
  const browser = get(parsedUserAgent, "browser.name") || null;
  let connectionType: ConnectionType;
  if (mobileDetect.mobile()) {
    connectionType = ConnectionType.MOBILE;
  } else if (mobileDetect.phone()) {
    connectionType = ConnectionType.PHONE;
  } else if (mobileDetect.tablet()) {
    connectionType = ConnectionType.TABLET;
  } else {
    connectionType = ConnectionType.WEB;
  }
  const device =
    [
      get(parsedUserAgent, "device.vendor"),
      get(parsedUserAgent, "device.model"),
      get(parsedUserAgent, "device.type"),
    ]
      .filter((el) => el === 0 || !!el)
      .join(" ") || null;
  const engine = get(parsedUserAgent, "engine.name") || null;
  const cpu = get(parsedUserAgent, "cpu.architecture") || null;

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
