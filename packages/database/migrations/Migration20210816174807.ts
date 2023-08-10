import { Migration } from '@mikro-orm/migrations';

export class Migration20210816174807 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "guild_user" add column "birthday_msg" varchar(20) null;',
    );
  }
}
