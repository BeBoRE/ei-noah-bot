import { Migration } from '@mikro-orm/migrations';

export class Migration20220122145701 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "corona_data" drop column "hospital_admissions";');
  }

}
