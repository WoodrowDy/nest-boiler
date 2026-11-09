import { faker } from "@faker-js/faker";
import { setSeederFactory } from "typeorm-extension";
import { User } from "../entities/user.entity";

/**
 * 시드 팩토리 — faker 로 랜덤 더미를 만든다. `prod` 에서는 시드가 호출하지 않는다.
 *
 * ★ faker 를 콜백 인자가 아니라 직접 import 한다.
 *   typeorm-extension 3.x 는 @faker-js/faker 를 의존으로 물고 콜백 첫 인자로 넘겨줬다.
 *   4.x 에서 그 의존이 빠지고 인자가 Meta 제네릭으로 일반화됐다 — SeederFactory.setMeta()
 *   를 부르지 않으면 undefined 가 들어온다. 넘겨받을 것이 없으므로 직접 가져온다.
 *
 * 이메일은 살아 있는 사용자끼리 유일해야 해서 무작위 12 자로 만든다. 휴대폰은 정규화된 모양(숫자 11 자리)으로.
 */
export const UserFactory = setSeederFactory(User, () => {
  const user = new User();

  user.email = `${faker.string.alphanumeric({ length: 12, casing: "lower" })}@example.com`;
  user.name = faker.person.fullName();
  user.phone = `010${faker.string.numeric(8)}`;

  return user;
});
