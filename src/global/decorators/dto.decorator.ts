import { applyDecorators } from '@nestjs/common';
import { Type } from 'class-transformer';
import {
    IsDate,
    IsEmail,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Length,
    Matches,
    Max,
    Min,
    registerDecorator,
    ValidateNested,
    ValidationArguments,
    ValidationOptions,
} from 'class-validator';

interface DefaultValidationConfig extends ValidationOptions {
    required: boolean;
}

interface StringValidationConfig extends DefaultValidationConfig {
    minLength: number;
    maxLength: number;
    each?: boolean;
}

interface NumberValidationConfig extends DefaultValidationConfig {
    minNumber: number;
    maxNumber: number;
    each?: boolean;
}

interface EnumValidationConfig extends DefaultValidationConfig {
    type: object;
}

interface MatchesValidationConfig extends DefaultValidationConfig {
    pattern: RegExp;
}

interface ObjectValidationConfig extends DefaultValidationConfig {
    type;
    each?: boolean;
}

type BooleanValidationConfig = DefaultValidationConfig;

export const IsCustomString = function (config: StringValidationConfig) {
    const decorators = [];

    if (config.required === false) decorators.push(IsOptional());
    else if (config.required === true) decorators.push(IsNotEmpty());

    if (config.each === true) {
        decorators.push(IsString({ each: config.each }));
    } else {
        decorators.push(IsString());
        decorators.push(Length(config.minLength, config.maxLength));
    }

    return applyDecorators(...decorators);
};

export const IsCustomNumber = function (config: NumberValidationConfig) {
    const decorators = [];

    if (config.required === false) decorators.push(IsOptional());
    else if (config.required === true) decorators.push(IsNotEmpty());

    if (config.each === true) {
        decorators.push(IsNumber({}, { each: config.each }));
        decorators.push(Min(config.minNumber, { each: config.each }));
        decorators.push(Max(config.maxNumber, { each: config.each }));
    } else {
        decorators.push(IsNumber());
        decorators.push(Min(config.minNumber));
        decorators.push(Max(config.maxNumber));
    }

    return applyDecorators(...decorators);
};

export const IsCustomEnum = function (config: EnumValidationConfig) {
    const decorators = [];

    if (config.required === false) decorators.push(IsOptional());
    else if (config.required === true) decorators.push(IsNotEmpty());

    decorators.push(IsEnum(config.type));

    return applyDecorators(...decorators);
};

const IsBoolean = function () {
    return function (object: object, propertyName: string) {
        registerDecorator({
            name: 'isBoolean',
            target: object.constructor,
            propertyName: propertyName,
            validator: {
                validate(value: any) {
                    return (
                        value === 'true' ||
                        value === true ||
                        value === 'false' ||
                        value === false
                    );
                },
                //IsBoolean 함수 내 해당 값들이 boolean 으로 인식되지 않는 경우 기본 오류 처리
                defaultMessage(args: ValidationArguments) {
                    return `${args.property} must be a boolean value`;
                },
            },
        });
    };
};

export const IsCustomBoolean = function (config: BooleanValidationConfig) {
    return function (object: object, propertyName: string) {
        if (config.required === false) IsOptional()(object, propertyName);
        else if (config.required === true) IsNotEmpty()(object, propertyName);

        IsBoolean()(object, propertyName);
    };
};

type EmailValidationConfig = DefaultValidationConfig;

export const IsCustomEmail = function (config: EmailValidationConfig) {
    const decorators = [];

    if (config.required === false) decorators.push(IsOptional());
    else if (config.required === true) decorators.push(IsNotEmpty());

    decorators.push(IsEmail());

    return applyDecorators(...decorators);
};

export const IsCustomMatches = function (config: MatchesValidationConfig) {
    const decorators = [];

    if (config.required === false) decorators.push(IsOptional());
    else if (config.required === true) decorators.push(IsNotEmpty());

    if (config.each === true) {
        decorators.push(Matches(config.pattern, { each: config.each }));
    } else {
        decorators.push(Matches(config.pattern));
    }

    return applyDecorators(...decorators);
};

type DateValidationConfig = DefaultValidationConfig;

export const IsCustomDate = function (config: DateValidationConfig) {
    const decorators = [];

    if (config.required === false) decorators.push(IsOptional());
    else if (config.required === true) decorators.push(IsNotEmpty());

    decorators.push(IsDate());

    return applyDecorators(...decorators);
};

export const IsCustomObject = function (config: ObjectValidationConfig) {
    const decorators = [];

    if (config.required === false) decorators.push(IsOptional());
    else if (config.required === true) decorators.push(IsNotEmpty());

    if (config.each === true) {
        decorators.push(IsObject({ each: config.each }));
        decorators.push(ValidateNested({ each: config.each }));
        decorators.push(Type(() => config.type));
    } else {
        decorators.push(IsObject());
        decorators.push(ValidateNested());
        decorators.push(Type(() => config.type));
    }

    return applyDecorators(...decorators);
};
