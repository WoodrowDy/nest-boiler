import { applyDecorators } from "@nestjs/common";
import { ApiProperty, ApiPropertyOptions } from "@nestjs/swagger";
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
} from "class-validator";

interface DefaultValidationConfig extends ValidationOptions {
  required: boolean;
}

/**
 * ★ interface extends 가 아니라 교차 타입이다.
 *   @nestjs/swagger 11 에서 ApiPropertyOptions 가 유니온이 되어, 인터페이스로는
 *   상속할 수 없다("statically known members" 가 아니다). 교차 타입은 유니온을 받는다.
 *
 * ★ type 을 이 데코레이터가 실제로 다루는 넷으로 좁힌다.
 *   ApiPropertyOptions 의 type 을 그대로 받으면 "object" 분기가 섞여 들어오고,
 *   그 분기는 additionalProperties 를 필수로 요구해 ApiProperty 에 넘길 수 없다.
 *   아래 switch 가 string · number · boolean · Date 만 처리하므로 타입도 그렇게 적는다 —
 *   객체 스키마가 필요하면 @ApiProperty 를 직접 쓰는 편이 맞다.
 */
type ApiPropertyValidatorOption = Omit<ApiPropertyOptions, "type" | "required"> & {
  type: "string" | "number" | "boolean" | typeof Date;
  /**
   * ★ swagger 11 에서 required 가 boolean | string[] 로 넓어졌다(객체 스키마에서
   *   필수 속성 이름 목록을 받기 위해서다). 이 데코레이터는 단일 속성에 붙으므로
   *   boolean 만 의미가 있다 — IsRequired 도 참/거짓으로만 쓴다.
   */
  required: boolean;
  validator?: DefaultValidationConfig;
};

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
  if (type === "number" && !options.maximum) {
    options.maximum = Number.MAX_SAFE_INTEGER;
  }

  let { isArray } = options;

  isArray = isArray === true || isArray === false ? isArray : false;

  const decorators = [];

  if (isArray) {
    decorators.push(IsCustomArray(options));
  }

  /**
   * ★ ApiPropertyOptions 로 한 번 받아 넘긴다.
   *   swagger 11 에서 이 타입이 유니온이 되어, 객체 리터럴을 그대로 넘기면
   *   type 이 넓을 때 "object" 분기로 추론돼 additionalProperties 를 요구한다.
   */
  const apiPropertyOptions: ApiPropertyOptions = {
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
  };
  const apiProperty = ApiProperty(apiPropertyOptions);

  decorators.push(apiProperty, IsRequired(options));

  switch (type) {
    case "string": {
      decorators.push(IsCustomString(options));
      break;
    }
    case "number": {
      decorators.push(IsCustomNumber(options));
      break;
    }
    case "boolean": {
      decorators.push(IsCustomBoolean(options));
      break;
    }
    /**
     * ★ "date" 는 OpenAPI 의 type 이 아니다 — swagger 10 이 느슨해서 통과했을 뿐이다.
     *   날짜는 type: Date (생성자) 로 주고, 포맷은 format: "date-time" 으로 표현한다.
     */
    case Date: {
      decorators.push(IsCustomDate(options));
      break;
    }
  }

  if (options.enum) {
    decorators.push(IsCustomEnum(options));
  }

  if (typeof type === "function") {
    decorators.push(IsCustomObject(options));
  }

  return applyDecorators(...decorators);
};

function IsRequired(config: ApiPropertyValidatorOption) {
  return function (object: Record<string, unknown>, propertyName: string) {
    if (config.required) {
      IsNotEmpty({
        message: (args: ValidationArguments) => `${config.name || args.property}은(는) 필수입니다.`,
      })(object, propertyName);
    } else {
      IsOptional()(object, propertyName);
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
          `${config.name || args.property}의 최소 배열의 길이는 ${config.minItems}이어야합니다.`,
      })(object, propertyName);
    }
    if (config.maxItems) {
      ArrayMaxSize(config.maxItems, {
        message: (args: ValidationArguments) =>
          `${config.name || args.property}의 최대 배열의 길이는 ${config.maxItems}이어야합니다.`,
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
        `${config.name || args.property}은(는) 참과 거짓을 의미하는 데이터 타입입니다.`,
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
