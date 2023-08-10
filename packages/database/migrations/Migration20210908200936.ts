import { Migration } from '@mikro-orm/migrations';

export class Migration20210908200936 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'create table "lobby_name_change" ("id" serial primary key, "guild_user_id" int4 not null, "name" varchar(99) not null, "date" timestamptz(0) not null);',
    );
    this.addSql(
      'create index "lobby_name_change_guild_user_id_index" on "lobby_name_change" ("guild_user_id");',
    );

    this.addSql(
      'alter table "lobby_name_change" add constraint "lobby_name_change_guild_user_id_foreign" foreign key ("guild_user_id") references "guild_user" ("id") on update cascade;',
    );
  }
}
