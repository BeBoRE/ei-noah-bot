import { Migration } from '@mikro-orm/migrations';

export class Migration20210202231241 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "guild_user" drop constraint "guild_user_temp_channel_unique";');
    this.addSql('alter table "guild_user" drop column "temp_channel";');
    this.addSql('alter table "guild_user" drop column "temp_created_at";');
    this.addSql('alter table "guild_user" drop column "temp_name";');

    this.addSql('create table "temp_channel" ("channel_id" varchar(255) not null, "guild_user_id" int4 not null, "created_at" timestamptz(0) not null, "name" varchar(255) null);');
    this.addSql('alter table "temp_channel" add constraint "temp_channel_pkey" primary key ("channel_id");');
    this.addSql('alter table "temp_channel" add constraint "temp_channel_guild_user_id_unique" unique ("guild_user_id");');

    this.addSql('alter table "temp_channel" add constraint "temp_channel_guild_user_id_foreign" foreign key ("guild_user_id") references "guild_user" ("id") on update cascade;');
  }

}
