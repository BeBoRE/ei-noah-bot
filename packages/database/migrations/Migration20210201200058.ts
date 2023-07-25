import { Migration } from '@mikro-orm/migrations';

export class Migration20210201200058 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "guild_user" add column "temp_name" varchar(98) null;');
  }

}
