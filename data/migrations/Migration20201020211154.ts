import { Migration } from '@mikro-orm/migrations';

export class Migration20201020211154 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "public_key" ("id" varchar(255) not null, "key" varchar(269) not null, "expires" timestamptz(0) not null);');
    this.addSql('alter table "public_key" add constraint "public_key_pkey" primary key ("id");');
    this.addSql('alter table "public_key" add constraint "public_key_key_unique" unique ("key");');
  }

}
