import { Migration } from '@mikro-orm/migrations';

export class Migration20210209185038 extends Migration {
  async up(): Promise<void> {
    this.addSql(
      'alter table "guild" add column "lobby_category" varchar(255) null;',
    );
  }
}
