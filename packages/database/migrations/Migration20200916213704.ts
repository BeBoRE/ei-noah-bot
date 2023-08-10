import { Migration } from '@mikro-orm/migrations';

export class Migration20200916213704 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "guild_user" drop constraint "guild_user_pkey"');
    this.addSql('alter table "guild_user" add column "id" serial primary key;');

    this.addSql(
      'CREATE UNIQUE INDEX "guild_user_guild_user_index" ON "guild_user" ("guild_id", "user_id");',
    );
    this.addSql(
      'ALTER TABLE "guild_user" ADD CONSTRAINT "unique_guild_user" UNIQUE USING INDEX "guild_user_guild_user_index";',
    );

    this.addSql(
      'create table "quote" ("id" serial primary key, "guild_user_id" int4 not null, "text" varchar(255) not null);',
    );

    this.addSql(
      'alter table "quote" add constraint "quote_guild_user_id_foreign" foreign key ("guild_user_id") references "guild_user" ("id") on update cascade;',
    );
  }
}
