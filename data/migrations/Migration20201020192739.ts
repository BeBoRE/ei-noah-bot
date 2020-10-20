import { Migration } from '@mikro-orm/migrations';

export class Migration20201020192739 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "user" drop column "last_corona_report";');

    this.addSql('alter table "guild_user" drop constraint if exists "guild_user_temp_created_at_check";');
    this.addSql('alter table "guild_user" alter column "temp_created_at" type timestamptz(0) using ("temp_created_at"::timestamptz(0));');

    this.addSql('create table "access_token" ("token" varchar(255) not null, "user_id" varchar(255) not null, "expires" timestamptz(0) not null);');
    this.addSql('alter table "access_token" add constraint "access_token_pkey" primary key ("token");');
    this.addSql('alter table "access_token" add constraint "access_token_user_id_unique" unique ("user_id");');

    this.addSql('alter table "access_token" add constraint "access_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;');

    this.addSql('alter table "guild_user" drop constraint "unique_tempchannel";');

    this.addSql('alter table "guild_user" drop constraint "unique_guild_user";');
  }

}
