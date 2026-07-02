import { setSeederFactory } from "typeorm-extension";
import { StaticBoard } from "../entities/static-board.entity";
import { normalizePhone } from "src/global/helpers/phone.helper";

export const StaticBoardFactory = setSeederFactory(StaticBoard, (faker) => {
  const staticBoard = new StaticBoard();

  staticBoard.birth = faker.date.past({ years: 1 });
  staticBoard.body = faker.lorem.paragraphs(2);
  staticBoard.category = faker.helpers.arrayElement(["공지사항", "FAQ", "이벤트", "가이드"]);
  staticBoard.isActivated = faker.datatype.boolean({ probability: 0.8 });
  staticBoard.writer = faker.person.fullName();
  staticBoard.phone = normalizePhone(faker.phone.number("010-####-####"));

  return staticBoard;
});
