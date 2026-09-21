import { StaticBoard } from "../entities/static-board.entity";
import { StaticBoardResponse } from "../dtos/response/static-board.dto";

/**
 * Entity → Response 변환 전담(무상태).
 *
 * ★ 나가는 필드를 한 줄씩 적는 것이 이 파일의 목적이다.
 *   TypeScript 타입은 런타임에 없다 — 반환 타입을 적어도 아무것도 걸러지지 않고,
 *   이 레포는 ClassSerializerInterceptor 도 쓰지 않는다. 엔티티를 그대로 돌려주면
 *   새로 붙인 컬럼이 그대로 나간다. **적지 않은 것은 나가지 않는다** —
 *   이 기본값(닫힘)이 @Exclude(열림)보다 안전하다. 빠뜨리면 안 나갈 뿐이고,
 *   @Exclude 는 빠뜨리면 새어 나간다.
 *
 * ★ 값을 만들지 않는다. 고르고 옮기기만 한다.
 *   계산·집계·포맷·정책 판단이 들어오려 하면 그 값은 도메인 것이다.
 *   판별: **HTTP 를 지워도 그 코드가 필요한가.** 필요하면 도메인이다 —
 *   서비스가 만들어 도메인 결과에 실어 보내고, 여기서는 한 줄로 받는다.
 *
 * ★ 조회하지 않는다. repository · service · typeorm import 는 lint 가 막는다.
 *   필요한 값은 서비스가 미리 모아서 인자로 넘긴다. 줄이 여럿이면 Map 으로 받는다 —
 *   줄마다 조회하면 목록 하나에 N+1 이 생긴다.
 *
 * ★ 엔티티를 받는 것은 이 도메인이 순수 CRUD 라서다. 엔티티가 곧 도메인 결과다.
 *   계산·집계·다른 테이블 값이 필요해지면 그때가 전환 시점이고, 순서가 있다 —
 *     1) 서비스 파일에 결과 타입을 export 한다 (StaticBoardView 같은)
 *     2) 서비스가 그것을 반환한다
 *     3) 매퍼가 그것을 받는다
 *   그 뒤에야 매퍼를 없애고 응답 DTO 의 static from() 으로 옮길 수 있다.
 *   순서를 건너뛰고 from(entity) 로 가면 dtos/response 가 entities 를 import 하게 된다 —
 *   전송 타입이 영속성 타입에 의존하는 역전이고, 이 레포가 다른 곳에서 막는 방향이다.
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
