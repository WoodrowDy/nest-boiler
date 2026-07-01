import { WinstonModuleOptions } from "nest-winston";
import * as winston from "winston";
import { RequestContext } from "../context/request-context";

const { combine, timestamp, printf, colorize } = winston.format;

/**
 * 모든 로그 라인에 요청 traceId(RequestContext/ALS)를 자동으로 주입한다.
 * → 한 요청에서 발생한 로그를 traceId 로 상관관계(correlation) 추적 가능.
 */
const withTraceId = winston.format((info) => {
  const traceId = RequestContext.getTraceId();
  if (traceId) info.traceId = traceId;
  return info;
});

const lineFormat = printf((info) => {
  const ctx = info.context ? ` [${String(info.context)}]` : "";
  const tid = info.traceId ? ` (${String(info.traceId)})` : "";
  return `${String(info.timestamp)} ${info.level}${ctx}${tid} ${String(info.message)}`;
});

export const winstonConfig: WinstonModuleOptions = {
  level: process.env.NODE_ENV === "prod" ? "info" : "debug",
  transports: [
    new winston.transports.Console({
      // colorize 는 printf 앞에 와야 레벨(info.level)에 색이 입혀진다
      format: combine(withTraceId(), timestamp(), colorize(), lineFormat),
    }),
  ],
};
