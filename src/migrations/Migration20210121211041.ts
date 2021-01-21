import { Migration } from 'mikro-orm';

export class Migration20210121211041 extends Migration {

  async up(): Promise<void> {
    this.addSql('UPDATE "user" set "birthday" = null WHERE "birthday" > \'today\'');
  }

}
