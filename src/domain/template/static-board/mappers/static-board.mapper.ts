import { StaticBoard } from "../entities/static-board.entity";
import { StaticBoardResponse } from "../dtos/response/static-board.dto";

/**
 * Entity → Response 변환 전담(무상태).
 * - 서비스/컨트롤러 경계에서 호출한다. 서비스 안에 변환 로직을 두지 않는다.
 * - 노출 필드를 명시적으로 복사하여 과다 노출을 방지한다.
 */
export const StaticBoardMapper = {
  toResponse(entity: StaticBoard): StaticBoardResponse {
    const dto = new StaticBoardResponse();
    dto.id = entity.id;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    dto.deletedAt = entity.deletedAt;
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
