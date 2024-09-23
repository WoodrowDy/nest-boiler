import { Type } from '@nestjs/common';

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

    // authUserOnly?: boolean;
}
