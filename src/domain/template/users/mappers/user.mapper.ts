import { User } from "../entities/user.entity";
import {
  UserDetailResponse,
  UserListItemResponse,
  UserSaveResponse,
} from "../dtos/response/user.dto";

/**
 * Entity → Response 변환 전담(무상태).
 *
 * ★ 나가는 필드를 한 줄씩 적는 것이 이 파일의 목적이다. 적지 않은 것은 나가지 않는다.
 * ★ 값을 만들지 않는다. 고르고 옮기기만 한다.
 * ★ 입력 타입을 쓰는 필드만으로 좁힌다 — 시그니처가 "이 응답은 휴대폰 번호를 모른다" 를 말해준다.
 */
type UserSaveSource = Pick<User, "id" | "createdAt" | "updatedAt" | "email" | "name">;
type UserListItemSource = UserSaveSource & Pick<User, "boardCount">;

export const UserMapper = {
  toSaveResponse(user: UserSaveSource): UserSaveResponse {
    const dto = new UserSaveResponse();
    dto.id = user.id;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    dto.email = user.email;
    dto.name = user.name;

    return dto;
  },

  toListItem(user: UserListItemSource): UserListItemResponse {
    const dto = new UserListItemResponse();
    dto.id = user.id;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    dto.email = user.email;
    dto.name = user.name;
    dto.boardCount = user.boardCount;

    return dto;
  },

  toDetail(user: User): UserDetailResponse {
    const dto = new UserDetailResponse();
    dto.id = user.id;
    dto.createdAt = user.createdAt;
    dto.updatedAt = user.updatedAt;
    dto.email = user.email;
    dto.name = user.name;
    dto.boardCount = user.boardCount;
    dto.phone = user.phone;

    return dto;
  },
};
