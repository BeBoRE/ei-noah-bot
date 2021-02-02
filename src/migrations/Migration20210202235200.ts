import { Migration } from '@mikro-orm/migrations';

export class Migration20210202235200 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "temp_channel" add column "text_channel_id" varchar(16) null;');
  }

}
