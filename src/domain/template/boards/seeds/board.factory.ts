import { faker } from "@faker-js/faker";
import { setSeederFactory } from "typeorm-extension";
import { Board } from "../entities/board.entity";

/**
 * 시드 팩토리 — 제목·본문만 만든다. userId 는 넣지 않는다(시더가 정한다).
 * BoardSeeder 는 이 팩토리를 make() 로만 쓴다 — 저장은 createBoard 가 해야 boardCount 가 맞는다.
 * faker 를 직접 import 하는 이유는 user.factory.ts 주석 참고.
 */
export const BoardFactory = setSeederFactory(Board, () => {
  const board = new Board();

  board.title = faker.lorem.sentence({ min: 2, max: 6 }).slice(0, 100);
  board.content = faker.lorem.paragraphs(2);

  return board;
});
