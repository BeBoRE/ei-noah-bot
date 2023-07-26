import { Migration } from '@mikro-orm/migrations';

export class Migration20210918132439 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "user" add column "language" varchar(255) null;');

    this.addSql('alter table "guild" add column "language" varchar(255) null;');
  }
}
