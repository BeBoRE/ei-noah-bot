import { Migration } from '@mikro-orm/migrations';

export class Migration20220519103746 extends Migration {
  async up(): Promise<void> {
    this.addSql('create index "user_birthday_index" on "user" ("birthday");');

    this.addSql('alter table "user_corona_regions" drop constraint "userRegion";');
    this.addSql('alter table "user_corona_regions" add constraint "user_corona_regions_user_id_region_unique" unique ("user_id", "region");');

    this.addSql('drop index "guild_user_guild_id_index";');
    this.addSql('drop index "guild_user_user_id_index";');

    this.addSql('alter table "quote" alter column "text" type varchar(2000) using ("text"::varchar(2000));');

    this.addSql('alter table "temp_channel" alter column "channel_id" type varchar(255) using ("channel_id"::varchar(255));');
    this.addSql('alter table "temp_channel" alter column "name" type varchar(98) using ("name"::varchar(98));');

    this.addSql('alter table "corona_data" drop constraint "dateCommunity";');
    this.addSql('alter table "corona_data" add constraint "corona_data_date_community_unique" unique ("date", "community");');
  }

  async down(): Promise<void> {
    this.addSql('alter table "corona_data" add constraint "dateCommunity" unique ("date", "community");');
    this.addSql('alter table "corona_data" drop constraint "corona_data_date_community_unique";');

    this.addSql('create index "guild_user_guild_id_index" on "guild_user" ("guild_id");');
    this.addSql('create index "guild_user_user_id_index" on "guild_user" ("user_id");');

    this.addSql('alter table "quote" alter column "text" type varchar using ("text"::varchar);');

    this.addSql('alter table "temp_channel" alter column "channel_id" type varchar using ("channel_id"::varchar);');
    this.addSql('alter table "temp_channel" alter column "name" type varchar using ("name"::varchar);');

    this.addSql('drop index "user_birthday_index";');

    this.addSql('alter table "user_corona_regions" add constraint "userRegion" unique ("user_id", "region");');
    this.addSql('alter table "user_corona_regions" drop constraint "user_corona_regions_user_id_region_unique";');
  }
}
