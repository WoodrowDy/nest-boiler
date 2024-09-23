import { applyDecorators } from '@nestjs/common';
import {
    ApiExtraModels,
    ApiOkResponse,
    ApiOperation,
    getSchemaPath,
} from '@nestjs/swagger';
import { ListResponse } from '../dtos/list-response.dto';
import { ObjectResponse } from '../dtos/object-response.dto';
import { ApiDocOptions } from '../interfaces/api-doc.options';

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
                        required: ['row'],
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
                        required: ['rows'],
                        properties: {
                            rows: {
                                type: 'array',
                                items: { $ref: getSchemaPath(responseModel) },
                            },
                        },
                    },
                ],
            },
        });
        decorators.push(listResponse);
    }

    return applyDecorators(...decorators);

    /**
     * Swagger Error 스키마 등록시 예시입력을 위한 Helper
     * @param description - 오류명
     * @param examples - 오류객체 예시 객체정보
     */
    const createErrorResponseSchemaExamples = (
        description: string,
        examples: {
            statusCode: number;
            message: string;
            error: string;
        },
    ) => {
        return {
            description,
            schema: {
                type: 'object',
                required: ['statusCode', 'message', 'error'],
                properties: {
                    statusCode: {
                        type: 'number',
                        description: 'Http 응답코드',
                        example: examples.statusCode,
                    },
                    message: {
                        type: 'string',
                        description: '오류 메시지',
                        example: examples.message,
                    },
                    error: {
                        type: 'string',
                        description: '오류 코드',
                        example: examples.error,
                    },
                },
            },
        };
    };
};
