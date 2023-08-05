import { Migration } from '@mikro-orm/migrations';

export class Migration20210111092816 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "guild" add column "birthday_role" varchar(255) null;');
  }
}
