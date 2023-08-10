import { Migration } from '@mikro-orm/migrations';

export class Migration20230807203840 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "user" add column "expo_push_token" varchar(255) null;',
    );
  }

  async down(): Promise<void> {
    this.addSql('alter table "user" drop column "expo_push_token";');
  }
}
