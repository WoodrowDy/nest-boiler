import { faker } from "@faker-js/faker";
import { setSeederFactory } from "typeorm-extension";
import { StaticBoard } from "../entities/static-board.entity";
import { normalizePhone } from "src/global/helpers/phone.helper";

/**
 * 시드 팩토리 — faker 로 랜덤 더미를 만든다. `prod` 에서는 시드가 호출하지 않는다.
 *
 * ★ faker 를 콜백 인자가 아니라 직접 import 한다.
 *   typeorm-extension 3.x 는 @faker-js/faker 를 의존으로 물고 콜백 첫 인자로 넘겨줬다.
 *   4.x 에서 그 의존이 빠지고 인자가 Meta 제네릭으로 일반화됐다 — SeederFactory.setMeta()
 *   를 부르지 않으면 undefined 가 들어온다. 넘겨받을 것이 없으므로 직접 가져온다.
 */
export const StaticBoardFactory = setSeederFactory(StaticBoard, () => {
  const staticBoard = new StaticBoard();

  staticBoard.birth = faker.date.past({ years: 1 });
  staticBoard.body = faker.lorem.paragraphs(2);
  staticBoard.category = faker.helpers.arrayElement(["공지사항", "FAQ", "이벤트", "가이드"]);
  staticBoard.isActivated = faker.datatype.boolean({ probability: 0.8 });
  staticBoard.writer = faker.person.fullName();
  staticBoard.phone = normalizePhone(faker.phone.number({ style: "national" }));

  return staticBoard;
});
