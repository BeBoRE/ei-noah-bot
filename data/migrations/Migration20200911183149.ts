import { Migration } from '@mikro-orm/migrations';

export class Migration20200911183149 extends Migration {

  async up(): Promise<void> {
    this.addSql('ALTER TABLE "guild_user" ADD CONSTRAINT "unique_tempchannel" UNIQUE ("temp_channel")')
  }

  async down(): Promise<void> {
    this.addSql('ALTER TABLE "guild_user" DROP CONSTRAINT "unique_tempchannel"')
  }

}
