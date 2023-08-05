import { Migration } from '@mikro-orm/migrations';

export class Migration20230725130512 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "user" add column "timezone" varchar(255) null;');
  }

  async down(): Promise<void> {
    this.addSql('alter table "user" drop column "timezone";');
  }
}
