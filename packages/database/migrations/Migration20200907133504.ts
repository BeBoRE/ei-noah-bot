import { Migration } from '@mikro-orm/migrations';

export class Migration20200907133504 extends Migration {
  async up(): Promise<void> {
    this.addSql('create table "category" ("id" varchar(255) not null, "is_lobby_category" bool not null);');
    this.addSql('alter table "category" add constraint "category_pkey" primary key ("id");');

    this.addSql('create table "channel" ("id" varchar(255) not null);');
    this.addSql('alter table "channel" add constraint "channel_pkey" primary key ("id");');

    this.addSql('create table "guild" ("id" varchar(255) not null, "bitrate" int4 not null default 96000);');
    this.addSql('alter table "guild" add constraint "guild_pkey" primary key ("id");');

    this.addSql('create table "guild_user" ("guild_id" varchar(255) not null, "user_id" varchar(255) not null, "temp_channel" varchar(255) null, "temp_created_at" timestamptz(0) null);');
    this.addSql('create index "guild_user_guild_id_index" on "guild_user" ("guild_id");');
    this.addSql('create index "guild_user_user_id_index" on "guild_user" ("user_id");');
    this.addSql('alter table "guild_user" add constraint "guild_user_pkey" primary key ("guild_id", "user_id");');

    this.addSql('create table "user" ("id" varchar(255) not null, "count" int4 not null);');
    this.addSql('alter table "user" add constraint "user_pkey" primary key ("id");');

    this.addSql('alter table "guild_user" add constraint "guild_user_guild_id_foreign" foreign key ("guild_id") references "guild" ("id") on update cascade;');
    this.addSql('alter table "guild_user" add constraint "guild_user_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;');
  }
}
