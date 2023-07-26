import { Migration } from '@mikro-orm/migrations';

export class Migration20210209144539 extends Migration {
  async up(): Promise<void> {
    this.addSql('alter table "guild" add column "public_voice" varchar(255) null, add column "mute_voice" varchar(255) null, add column "private_voice" varchar(255) null;');
  }
}
