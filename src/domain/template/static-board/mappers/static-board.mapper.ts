import { StaticBoard } from "../entities/static-board.entity";
import { StaticBoardResponse } from "../dtos/response/static-board.dto";
import { GenerateStaticBoardPayload } from "../dtos/request/generate-static-board.dto";
import { ModifyStaticBoardPayload } from "../dtos/request/modify-static-board.dto";
import { GetStaticBoardQuery } from "../dtos/request/get-static-board.dto";
import {
  CreateStaticBoardCommand,
  StaticBoardCriteria,
  UpdateStaticBoardCommand,
} from "../commands/static-board.command";

/**
 * 컨트롤러 경계의 변환 전담(무상태).
 *   들어올 때: 요청 DTO → 커맨드 / 조회 조건
 *   나갈 때:   엔티티 → 응답 DTO
 *
 * ★ 양쪽 다 한 줄씩 적는 것이 이 파일의 목적이다.
 *   TypeScript 타입은 런타임에 없다 — 반환 타입을 적어도 아무것도 걸러지지 않고,
 *   이 레포는 ClassSerializerInterceptor 도 쓰지 않는다. 엔티티를 그대로 돌려주면
 *   새로 붙인 컬럼이 그대로 나간다. **적지 않은 것은 나가지 않는다** —
 *   이 기본값(닫힘)이 @Exclude(열림)보다 안전하다.
 *
 * ★ 값을 만들지 않는다. 고르고 옮기기만 한다.
 *   계산·집계·포맷·정책 판단이 들어오려 하면 그 값은 도메인 것이다.
 *   판별: **HTTP 를 지워도 그 코드가 필요한가.** 필요하면 도메인이다.
 *
 * ★ 조회하지 않는다. 포트 · 서비스 · typeorm import 는 lint 가 막는다.
 *   줄이 여럿이면 서비스가 미리 모아서 Map 으로 넘긴다 — 줄마다 조회하면 N+1 이 생긴다.
 */
export const StaticBoardMapper = {
  toCreateCommand(payload: GenerateStaticBoardPayload): CreateStaticBoardCommand {
    return {
      category: payload.category,
      writer: payload.writer,
      birth: payload.birth,
      phone: payload.phone,
      body: payload.body,
      isActivated: payload.isActivated,
    };
  },

  toUpdateCommand(payload: ModifyStaticBoardPayload): UpdateStaticBoardCommand {
    const command: UpdateStaticBoardCommand = {};

    // 넘어오지 않은 필드는 담지 않는다 — undefined 를 실어 보내면 의도가 흐려진다.
    if (payload.category !== undefined) command.category = payload.category;
    if (payload.writer !== undefined) command.writer = payload.writer;
    if (payload.birth !== undefined) command.birth = payload.birth;
    if (payload.phone !== undefined) command.phone = payload.phone;
    if (payload.body !== undefined) command.body = payload.body;
    if (payload.isActivated !== undefined) command.isActivated = payload.isActivated;

    return command;
  },

  toCriteria(query: GetStaticBoardQuery): StaticBoardCriteria {
    return {
      id: query.id,
      category: query.category,
      writerLike: query.writerLike,
    };
  },

  toResponse(entity: StaticBoard): StaticBoardResponse {
    const dto = new StaticBoardResponse();
    dto.id = entity.id;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.category = entity.category;
    dto.writer = entity.writer;
    dto.birth = entity.birth;
    dto.phone = entity.phone;
    dto.body = entity.body;
    dto.isActivated = entity.isActivated;
    return dto;
  },

  toList(entities: StaticBoard[]): StaticBoardResponse[] {
    return entities.map((entity) => StaticBoardMapper.toResponse(entity));
  },
};
