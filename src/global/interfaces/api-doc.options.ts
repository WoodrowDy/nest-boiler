import { Type } from "@nestjs/common";

export interface ApiDocOptions {
  /**
   * API summary
   */
  summary: string;

  /**
   * API description
   */
  description: string;

  /**
   * API responseModel
   */
  responseModel?: Type<any>;

  /**
   * API responseModel 의 배열 여부
   */
  isArrayResponse?: boolean;

  /**
   * API deprecated 여부
   */
  deprecated?: boolean;

  /**
   * 표준 에러 응답(400/401/403/404/500) Swagger 문서 자동 포함 여부 (기본: true)
   */
  withStandardErrors?: boolean;

  // authUserOnly?: boolean;
}
