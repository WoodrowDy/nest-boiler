import { INestApplication } from "@nestjs/common";
import request, { Response } from "supertest";
export const StaticBoardFixture = {
  async generateStaticBoard(app: INestApplication, body: any): Promise<Response> {
    return await request(app.getHttpServer()).post(`/static-boards`).send(body);
  },
  async getStaticBoardListAndCount(app, query): Promise<Response> {
    return await request(app.getHttpServer()).get(`/static-boards`).query(query);
  },

  async getStaticBoard(app, id): Promise<Response> {
    return await request(app.getHttpServer()).get(`/static-boards/${id}`);
  },
};
