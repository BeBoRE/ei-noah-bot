import { Migration } from 'mikro-orm';

export class Migration20200914223247 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "quote" ("id" serial primary key, "guild_user_guild_id" varchar(255) not null, "guild_user_user_id" varchar(255) not null, "text" varchar(255) not null);');
    this.addSql('create index "quote_guild_user_guild_id_guild_user_user_id_index" on "quote" ("guild_user_guild_id", "guild_user_user_id");');

    this.addSql('alter table "quote" add constraint "quote_guild_user_guild_foreign" foreign key ("guild_user_guild_id", "guild_user_user_id") references "guild_user" ("guild_id", "user_id") on update cascade;');
  }

  async down(): Promise<void> {
    this.addSql('drop table "quote"')
  }
}
