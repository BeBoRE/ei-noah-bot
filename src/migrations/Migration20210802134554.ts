import { Migration } from '@mikro-orm/migrations';

export class Migration20210802134554 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "guild" drop column "public_voice";');
    this.addSql('alter table "guild" drop column "mute_voice";');
    this.addSql('alter table "guild" drop column "private_voice";');
    this.addSql('alter table "guild" drop column "lobby_category";');

    this.addSql('alter table "temp_channel" add column "control_dashboard_id" varchar(24) null;');
  }

}
