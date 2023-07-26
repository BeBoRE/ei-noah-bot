import { Migration } from '@mikro-orm/migrations';

export class Migration20210202202443 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "guild_user" drop constraint "unique_tempchannel";');

    this.addSql('alter table "guild_user" drop constraint "unique_guild_user";');

    this.addSql('alter table "guild_user" add constraint "guild_user_guild_id_user_id_unique" unique ("guild_id", "user_id");');

    this.addSql('alter table "guild_user" add constraint "guild_user_temp_channel_unique" unique ("temp_channel");');
  }
}
