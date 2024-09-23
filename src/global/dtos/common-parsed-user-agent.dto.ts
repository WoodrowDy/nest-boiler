import { ConnectionType } from '../enums/common.enums';

export class CommonParsedUserAgentDto {
    ip: string; // 접속 IPv4
    country: string; // 접속 국가
    os: string; // 운영체제
    osVersion: string; // 운영체제 버전
    browser: string; // 브라우저
    connectionType: ConnectionType; // 접속 유형
    device: string; // 디바이스명
    engine: string; // 브라우저 엔진
    cpu: string; // cpu 아키텍쳐명
}
