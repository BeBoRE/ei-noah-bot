import { Migration } from '@mikro-orm/migrations';

export class Migration20220607134949 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "guild" add column "seperate_text_channel" boolean not null default false;',
    );
  }

  async down(): Promise<void> {
    this.addSql('alter table "guild" drop column "seperate_text_channel";');
  }
}
