import { StaticBoard } from "../../entities/static-board.entity";
import { PickType } from "@nestjs/swagger";

export class StaticBoardDto extends PickType(StaticBoard, [
  "category",
  "writer",
  "birth",
  "phone",
  "body",
  "isActivated",
]) {
  /**
   * 엔티티에서 DTO로 변환하는 팩토리 메소드
   * ->팩토리 메소드란?
   *   - 객체 생성을 담당하는 정적 메소드
   *   - 복잡한 객체 초기화 로직을 캡슐화
   *   - 타입 안전성과 가독성 향상
   *   - 다양한 생성 시나리오를 지원
   * @param entity StaticBoard 엔티티
   * @returns StaticBoardDto 인스턴스
   */
  static of(entity: StaticBoard): StaticBoardDto {
    const dto = new StaticBoardDto();
    dto.category = entity.category;
    dto.writer = entity.writer;
    dto.birth = entity.birth;
    dto.phone = entity.phone;
    dto.body = entity.body;
    dto.isActivated = entity.isActivated;
    return dto;
  }

  /**
   * 여러 엔티티를 DTO 배열로 변환하는 팩토리 메소드
   * @param entities StaticBoard 엔티티 배열
   * @returns StaticBoardDto 배열
   */
  static listOf(entities: StaticBoard[]): StaticBoardDto[] {
    return entities.map((entity) => this.of(entity));
  }

  /**
   * 전화번호를 하이픈 형태로 포맷팅
   * @returns 포맷된 전화번호 (예: 010-1234-5678)
   */
  getFormattedPhone(): string {
    if (!this.phone) return "";
    return this.phone.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  }

  /**
   * 생년월일을 기준으로 나이 계산
   * @returns 만 나이
   */
  getAge(): number {
    if (!this.birth) return 0;
    const today = new Date();
    const birthDate = new Date(this.birth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  /**
   * 게시물 활성화 상태를 문자열로 반환
   * @returns 활성화 상태 텍스트
   */
  getStatusText(): string {
    return this.isActivated ? "활성" : "비활성";
  }
}
