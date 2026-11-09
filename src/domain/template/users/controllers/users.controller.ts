import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { UsersService } from "../services/users.service";
import { ApiDoc } from "src/global/decorators/api-doc.decorator";
import { PostUserPayload } from "../dtos/request/post-user.dto";
import { GetUserQuery } from "../dtos/request/get-user.dto";
import { PatchUserPayload } from "../dtos/request/patch-user.dto";
import {
  UserDetailResponse,
  UserListItemResponse,
  UserSaveResponse,
} from "../dtos/response/user.dto";
import { UserMapper } from "../mappers/user.mapper";
import { ObjectResponse } from "src/global/dtos/object-response.dto";
import { ListResponse } from "src/global/dtos/list-response.dto";
import { PaginationQuery } from "src/global/dtos/pagination.dto";

/**
 * HTTP 경계.
 * - 입력: request DTO(payload/query). 출력: response DTO.
 * - 엔티티→응답 변환은 이 경계에서 UserMapper 로 수행한다.
 * - 메서드마다 await 는 하나. 둘이면 컨트롤러가 조율하고 있는 것이다 — 서비스로 접는다.
 */
@Controller(`users`)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @ApiDoc({
    summary: "사용자 생성",
    description: "사용자 생성. 이메일은 살아 있는 사용자끼리 유일하다(중복이면 409).",
    responseModel: UserSaveResponse,
  })
  @Post()
  async postUser(@Body() payload: PostUserPayload): Promise<ObjectResponse<UserSaveResponse>> {
    const user = await this.usersService.createUser(payload);

    return new ObjectResponse(UserMapper.toSaveResponse(user));
  }

  @ApiDoc({
    summary: "사용자 목록 조회",
    description: "사용자 목록 조회",
    responseModel: UserListItemResponse,
    isArrayResponse: true,
  })
  @Get()
  async getUsers(
    @Query() query: GetUserQuery,
    @Query() pagination: PaginationQuery
  ): Promise<ListResponse<UserListItemResponse[]>> {
    const { list, count } = await this.usersService.readUserListAndCount(query, pagination);

    return new ListResponse(
      list.map((user) => UserMapper.toListItem(user)),
      count
    );
  }

  @ApiDoc({
    summary: "사용자 단일 조회",
    description: "사용자 단일 조회",
    responseModel: UserDetailResponse,
  })
  @Get("/:id")
  async getUser(
    @Param("id", ParseIntPipe) id: number
  ): Promise<ObjectResponse<UserDetailResponse>> {
    const user = await this.usersService.readUser({ id });

    return new ObjectResponse(UserMapper.toDetail(user));
  }

  @ApiDoc({
    summary: "사용자 수정",
    description: "이름·휴대폰 번호 수정",
  })
  @Patch("/:id")
  async patchUser(
    @Param("id", ParseIntPipe) id: number,
    @Body() payload: PatchUserPayload
  ): Promise<void> {
    await this.usersService.modifyUser(id, payload);
  }

  @ApiDoc({
    summary: "사용자 삭제",
    description: "탈퇴(soft delete). 작성한 글은 남는다.",
  })
  @Delete("/:id")
  async deleteUser(@Param("id", ParseIntPipe) id: number): Promise<void> {
    await this.usersService.removeUser(id);
  }
}
