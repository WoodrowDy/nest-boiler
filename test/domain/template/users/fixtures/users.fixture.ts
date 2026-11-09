import { INestApplication } from "@nestjs/common";
import request, { Response } from "supertest";

/** /users 호출 묶음. boards 시나리오도 작성자를 만들고 지우는 데 쓴다. */
export const UsersFixture = {
  async postUser(app: INestApplication, body: object): Promise<Response> {
    return await request(app.getHttpServer()).post(`/users`).send(body);
  },

  async getUsers(app: INestApplication, query: object): Promise<Response> {
    return await request(app.getHttpServer()).get(`/users`).query(query);
  },

  async getUser(app: INestApplication, id: number | string): Promise<Response> {
    return await request(app.getHttpServer()).get(`/users/${id}`);
  },

  async patchUser(app: INestApplication, id: number, body: object): Promise<Response> {
    return await request(app.getHttpServer()).patch(`/users/${id}`).send(body);
  },

  async deleteUser(app: INestApplication, id: number): Promise<Response> {
    return await request(app.getHttpServer()).delete(`/users/${id}`);
  },
};
