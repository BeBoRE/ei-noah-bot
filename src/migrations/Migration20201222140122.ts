import { Migration } from 'mikro-orm';

export class Migration20201222140122 extends Migration {

  async up(): Promise<void> {
    this.addSql('alter table "user" add column "birthday" timestamptz(0) null;');
  }

}
