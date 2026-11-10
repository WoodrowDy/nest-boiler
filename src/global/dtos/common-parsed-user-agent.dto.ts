import { ConnectionType } from "../enums/common.enums";

export class CommonParsedUserAgentDto {
  ip: string | null; // 접속 IPv4 — 프록시 뒤에서 못 읽으면 null
  country: string | null; // 접속 국가 — IP 로 못 찾으면 null
  os: string | null; // 운영체제
  osVersion: string | null; // 운영체제 버전
  browser: string | null; // 브라우저
  connectionType: ConnectionType; // 접속 유형
  device: string | null; // 디바이스명
  engine: string | null; // 브라우저 엔진
  cpu: string | null; // cpu 아키텍쳐명
}
