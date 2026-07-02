import { applyDecorators } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  getSchemaPath,
} from "@nestjs/swagger";
import { ListResponse } from "../dtos/list-response.dto";
import { ObjectResponse } from "../dtos/object-response.dto";
import { ApiDocOptions } from "../interfaces/api-doc.options";

/**
 * 모든 엔드포인트에 공통으로 문서화할 표준 에러 응답.
 * 실제 런타임 에러 형태(Nest 기본 필터: { statusCode, message, error })와 일치.
 */
const STANDARD_ERROR_RESPONSES = [
  { status: 400, code: "BAD_REQUEST", message: "잘못된 요청(유효성 검증 실패 등)" },
  { status: 401, code: "UNAUTHORIZED", message: "인증이 필요합니다" },
  { status: 403, code: "FORBIDDEN", message: "접근 권한이 없습니다" },
  { status: 404, code: "NOT_FOUND", message: "리소스를 찾을 수 없습니다" },
  { status: 500, code: "INTERNAL_SERVER_ERROR", message: "서버 오류가 발생했습니다" },
];

/**
 * Decorator - swagger API
 * @Example
 * ```ts
 * @ApiDocs({
 *  summary: '',
 *  description: '',
 *  responseModel: ,
 *  isArrayResponse: true
 * })
 * ```
 * @param options - Swagger 작성 시 입력 가능한 옵션 객체
 */

export const ApiDoc = (options: ApiDocOptions) => {
  const {
    summary,
    description,
    responseModel,
    isArrayResponse = false,
    deprecated = false,
    withStandardErrors = true,
  } = options;

  const decorators = [];
  const hasObjectResponseModel = responseModel && !isArrayResponse;
  const hasListRepsonseModel = responseModel && isArrayResponse;
  const shouldAddModelSchema = responseModel;

  /**
   * 문서 정의 Decorator 등록
   */
  const apiOperation = ApiOperation({
    summary,
    description,
    deprecated,
  });
  decorators.push(apiOperation);

  /**
   * 공통 응답 스키마 등록 (Wrapper)
   */
  const extraModels = [ObjectResponse, ListResponse];
  if (shouldAddModelSchema) {
    extraModels.push(responseModel);
  }
  const apiExtraModels = ApiExtraModels(...extraModels);
  decorators.push(apiExtraModels);

  /**
   * 인증 필요시 헤더 스키마 등록 - 현재 사용하지 않음
   */
  // if (authUserOnly) {
  //   const authHeader = ApiHeader({
  //     name: 'x-auth-token',
  //     description: 'JWT 토큰',
  //     required: true,
  //   });
  //   decorators.push(authHeader);
  // }

  /**
   * 단일 객체 응답 스키마 (ObjectResponse)
   */
  if (hasObjectResponseModel) {
    const objectResponse = ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(ObjectResponse) },
          {
            required: ["row"],
            properties: {
              row: {
                $ref: getSchemaPath(responseModel),
              },
            },
          },
        ],
      },
    });
    decorators.push(objectResponse);
  }

  /**
   * 리스트 객체 응답 스키마 (ListResponse)
   */
  if (hasListRepsonseModel) {
    const listResponse = ApiOkResponse({
      schema: {
        allOf: [
          { $ref: getSchemaPath(ListResponse) },
          {
            required: ["rows"],
            properties: {
              rows: {
                type: "array",
                items: { $ref: getSchemaPath(responseModel) },
              },
            },
          },
        ],
      },
    });
    decorators.push(listResponse);
  }

  /**
   * 표준 에러 응답(400/401/403/404/500) 문서 등록
   */
  if (withStandardErrors) {
    for (const errorResponse of STANDARD_ERROR_RESPONSES) {
      decorators.push(
        ApiResponse({
          status: errorResponse.status,
          ...createErrorResponseSchemaExamples(errorResponse.message, {
            statusCode: errorResponse.status,
            message: errorResponse.message,
            error: errorResponse.code,
          }),
        })
      );
    }
  }

  return applyDecorators(...decorators);
};

/**
 * Swagger Error 스키마 등록시 예시입력을 위한 Helper
 * @param description - 오류명
 * @param examples - 오류객체 예시 객체정보
 */
export const createErrorResponseSchemaExamples = (
  description: string,
  examples: {
    statusCode: number;
    message: string;
    error: string;
  }
) => {
  return {
    description,
    schema: {
      type: "object",
      required: ["statusCode", "message", "error"],
      properties: {
        statusCode: {
          type: "number",
          description: "Http 응답코드",
          example: examples.statusCode,
        },
        message: {
          type: "string",
          description: "오류 메시지",
          example: examples.message,
        },
        error: {
          type: "string",
          description: "오류 코드",
          example: examples.error,
        },
      },
    },
  };
};
