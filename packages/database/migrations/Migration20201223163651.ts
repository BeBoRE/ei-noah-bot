import { Migration } from '@mikro-orm/migrations';

export class Migration20201223163651 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "guild" add column "birthday_channel" varchar(255) null;');
  }
}
