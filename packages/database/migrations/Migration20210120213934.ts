import { Migration } from '@mikro-orm/migrations';

export class Migration20210120213934 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "quote" add column "date" timestamptz(0) null;');
  }
}
