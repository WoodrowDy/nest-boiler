import { INestApplication } from "@nestjs/common";
import request, { Response } from "supertest";

/** /boards 호출 묶음. */
export const BoardsFixture = {
  async postBoard(app: INestApplication, body: object): Promise<Response> {
    return await request(app.getHttpServer()).post(`/boards`).send(body);
  },

  async getBoards(app: INestApplication, query: object): Promise<Response> {
    return await request(app.getHttpServer()).get(`/boards`).query(query);
  },

  async getBoard(app: INestApplication, id: number): Promise<Response> {
    return await request(app.getHttpServer()).get(`/boards/${id}`);
  },

  async patchBoard(app: INestApplication, id: number, body: object): Promise<Response> {
    return await request(app.getHttpServer()).patch(`/boards/${id}`).send(body);
  },

  async postPublishBoard(app: INestApplication, id: number): Promise<Response> {
    return await request(app.getHttpServer()).post(`/boards/${id}/publish`);
  },

  async deleteBoard(app: INestApplication, id: number): Promise<Response> {
    return await request(app.getHttpServer()).delete(`/boards/${id}`);
  },
};
