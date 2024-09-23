import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';
import {
    ArrayMaxSize,
    ArrayMinSize,
    IsArray,
    IsBoolean,
    IsDate,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
    Length,
    Max,
    Min,
    ValidateNested,
    ValidationArguments,
    ValidationOptions,
} from 'class-validator';

interface DefaultValidationConfig extends ValidationOptions {
    required: boolean;
}

interface ApiPropertyValidatorOption extends ApiPropertyOptions {
    validator?: DefaultValidationConfig;
}

export const ApiPropertyValidator = (options: ApiPropertyValidatorOption) => {
    const {
        required,
        description,
        type,
        example,
        minimum,
        maximum,
        maxLength,
        minLength,
        minItems,
        maxItems,
    } = options;

    //TODO 넘버 맥시멈 안먹음 확인 해보기
    if (type === 'number') {
        if (!options.maximum) {
            options.maximum = Number.MAX_SAFE_INTEGER;
        }
    }

    let { isArray } = options;

    if (isArray === true || isArray === false) {
        isArray = isArray;
    } else {
        isArray = false;
    }

    const decorators = [];

    if (isArray) {
        decorators.push(IsCustomArray(options));
    }

    const apiProperty = ApiProperty({
        required,
        description,
        type,
        example,
        isArray,
        enum: options.enum,
        minimum,
        maximum,
        maxLength,
        minLength,
        minItems,
        maxItems,
    });

    decorators.push(apiProperty);

    decorators.push(IsRequired(options));

    switch (type) {
        case 'string':
            decorators.push(IsCustomString(options));
            break;
        case 'number':
            decorators.push(IsCustomNumber(options));
            break;
        case 'boolean':
            decorators.push(IsCustomBoolean(options));
            break;
        case 'date':
            decorators.push(IsCustomDate(options));
            break;
    }

    if (options.enum) {
        decorators.push(IsCustomEnum(options));
    }

    if (typeof type === 'function') {
        decorators.push(IsCustomObject(options));
    }

    return applyDecorators(...decorators);
};

function IsRequired(config: ApiPropertyValidatorOption) {
    return function (object: Record<string, unknown>, propertyName: string) {
        if (!config.required) {
            IsOptional()(object, propertyName);
        } else {
            IsNotEmpty({
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}은(는) 필수입니다.`,
            })(object, propertyName);
        }
    };
}

function IsCustomArray(config: ApiPropertyValidatorOption) {
    return function (object: Record<string, unknown>, propertyName: string) {
        IsArray({
            message: (args: ValidationArguments) =>
                `${config.name || args.property}은(는) 배열 타입입니다.`,
        })(object, propertyName);
        if (config.minItems) {
            ArrayMinSize(config.minItems, {
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}의 최소 배열의 길이는 ${
                        config.minItems
                    }이어야합니다.`,
            })(object, propertyName);
        }
        if (config.maxItems) {
            ArrayMaxSize(config.maxItems, {
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}의 최대 배열의 길이는 ${
                        config.maxItems
                    }이어야합니다.`,
            })(object, propertyName);
        }
    };
}

function IsCustomString(config: ApiPropertyValidatorOption) {
    return function (object: Record<string, unknown>, propertyName: string) {
        if (config.isArray) {
            IsString({
                each: config.isArray,
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}은(는) 문자 타입이어야합니다.`,
            })(object, propertyName);
            Length(config.minLength, config.maxLength, {
                each: config.isArray,
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}의최소길이는 ${
                        config.minLength
                    }자이며 최대길이는 ${config.maxLength}자 입니다.`,
            })(object, propertyName);
        } else {
            IsString({
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}은(는) 문자 타입이어야합니다.`,
            })(object, propertyName);
            Length(config.minLength, config.maxLength, {
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}의 최소길이는 ${
                        config.minLength
                    }자이며 최대길이는 ${config.maxLength}자 입니다.`,
            })(object, propertyName);
        }
    };
}

function IsCustomNumber(config: ApiPropertyValidatorOption) {
    return function (object: Record<string, unknown>, propertyName: string) {
        if (config.isArray) {
            IsNumber(undefined, {
                each: config.isArray,
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}은(는) 숫자 타입입니다.`,
            })(object, propertyName);
            Min(config.minimum, {
                each: config.isArray,
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}의 최솟값은 ${config.minimum}입니다.`,
            })(object, propertyName);
            Max(config.maximum, {
                each: config.isArray,
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}의 최댓값은 ${config.maximum}입니다.`,
            })(object, propertyName);
        } else {
            IsNumber(undefined, {
                each: config.isArray,
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}은(는) 숫자 타입입니다.`,
            })(object, propertyName);
            Min(config.minimum, {
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}의 최솟값은 ${config.minimum}입니다.`,
            })(object, propertyName);
            Max(config.maximum, {
                message: (args: ValidationArguments) =>
                    `${config.name || args.property}의 최댓값은 ${config.maximum}입니다.`,
            })(object, propertyName);
        }
    };
}

function IsCustomEnum(config: ApiPropertyValidatorOption) {
    return function (object: Record<string, unknown>, propertyName) {
        IsEnum(config.enum, {
            each: config.isArray,
            message: (args: ValidationArguments) =>
                `${config.name || args.property}은(는) 이넘 타입입니다.`,
        })(object, propertyName);
    };
}

function IsCustomBoolean(config: ApiPropertyValidatorOption) {
    return function (object: Record<string, unknown>, propertyName) {
        IsBoolean({
            each: config.isArray,
            message: (args: ValidationArguments) =>
                `${
                    config.name || args.property
                }은(는) 참과 거짓을 의미하는 데이터 타입입니다.`,
        })(object, propertyName);
    };
}

function IsCustomObject(config: ApiPropertyValidatorOption) {
    return function (object: Record<string, unknown>, propertyName) {
        ValidateNested({
            each: config.isArray,
            message: (args: ValidationArguments) =>
                `${config.name || args.property}은(는) 객체타입 입니다.`,
        })(object, propertyName);
    };
}

function IsCustomDate(config: ApiPropertyValidatorOption) {
    return function (object: Record<string, unknown>, propertyName) {
        IsDate({
            message: (args: ValidationArguments) =>
                `${config.name || args.property}은(는) 날짜 형식입니다.`,
        })(object, propertyName);
    };
}
