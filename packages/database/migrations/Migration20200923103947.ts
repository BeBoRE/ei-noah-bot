import { Migration } from '@mikro-orm/migrations';

export class Migration20200923103947 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "quote" add column "creator_id" int4;');

    this.addSql('update "quote" set "creator_id" = "guild_user_id" where "creator_id" is null');

    this.addSql('alter table "quote" alter column "creator_id" set not null');

    this.addSql('alter table "quote" add constraint "quote_creator_id_foreign" foreign key ("creator_id") references "guild_user" ("id") on update cascade;');
  }
}
