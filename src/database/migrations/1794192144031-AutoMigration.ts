import { MigrationInterface, QueryRunner } from "typeorm";

export class AutoMigration1794192144031 implements MigrationInterface {
    name = 'AutoMigration1794192144031'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "User" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "email" character varying(255) NOT NULL, "name" character varying(50) NOT NULL, "phone" character varying(15) NOT NULL, "boardCount" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_9862f679340fb2388436a5ab3e4" PRIMARY KEY ("id")); COMMENT ON COLUMN "User"."id" IS '데이터 ID(PK)'; COMMENT ON COLUMN "User"."createdAt" IS '생성 일시'; COMMENT ON COLUMN "User"."updatedAt" IS '수정 일시'; COMMENT ON COLUMN "User"."deletedAt" IS '삭제 일시'; COMMENT ON COLUMN "User"."email" IS '이메일'; COMMENT ON COLUMN "User"."name" IS '이름'; COMMENT ON COLUMN "User"."phone" IS '휴대폰 번호'; COMMENT ON COLUMN "User"."boardCount" IS '작성한 글 수'`);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_3e36050eaf6ea8c997934f075e" ON "User"  ("email") WHERE "deletedAt" IS NULL`);
        await queryRunner.query(`CREATE TYPE "public"."BoardStatus" AS ENUM('DRAFT', 'PUBLISHED')`);
        await queryRunner.query(`CREATE TABLE "Board" ("id" SERIAL NOT NULL, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "deletedAt" TIMESTAMP WITH TIME ZONE, "userId" integer NOT NULL, "title" character varying(100) NOT NULL, "content" text NOT NULL, "status" "public"."BoardStatus" NOT NULL DEFAULT 'DRAFT', "publishedAt" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_a898df2ad483f1ad130bdcb56cc" PRIMARY KEY ("id")); COMMENT ON COLUMN "Board"."id" IS '데이터 ID(PK)'; COMMENT ON COLUMN "Board"."createdAt" IS '생성 일시'; COMMENT ON COLUMN "Board"."updatedAt" IS '수정 일시'; COMMENT ON COLUMN "Board"."deletedAt" IS '삭제 일시'; COMMENT ON COLUMN "Board"."userId" IS '작성자 사용자 ID'; COMMENT ON COLUMN "Board"."title" IS '제목'; COMMENT ON COLUMN "Board"."content" IS '본문'; COMMENT ON COLUMN "Board"."status" IS '상태'; COMMENT ON COLUMN "Board"."publishedAt" IS '발행 일시'`);
        await queryRunner.query(`CREATE INDEX "IDX_f7e8317a3d5a56a672dc701013" ON "Board"  ("userId") `);
        await queryRunner.query(`ALTER TABLE "Board" ADD CONSTRAINT "FK_f7e8317a3d5a56a672dc7010133" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "Board" DROP CONSTRAINT "FK_f7e8317a3d5a56a672dc7010133"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f7e8317a3d5a56a672dc701013"`);
        await queryRunner.query(`DROP TABLE "Board"`);
        await queryRunner.query(`DROP TYPE "public"."BoardStatus"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_3e36050eaf6ea8c997934f075e"`);
        await queryRunner.query(`DROP TABLE "User"`);
    }

}
