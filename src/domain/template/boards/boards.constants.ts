/** 글 상태. 엔티티(enum 컬럼)와 DTO(@IsEnum) 가 같이 쓴다. */
export enum BoardStatus {
  DRAFT = "DRAFT",
  PUBLISHED = "PUBLISHED",
}

export const constants = {
  props: {},
  errorMessages: {
    BOARD_NOT_FOUND: "게시글을 찾을 수 없습니다.",
    WRITER_NOT_FOUND: "작성자를 찾을 수 없습니다.",
    NOT_DRAFT: "초안 상태의 글만 발행할 수 있습니다.",
  },
};
