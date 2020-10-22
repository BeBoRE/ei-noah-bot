import { Migration } from '@mikro-orm/migrations';

export class Migration20201022225200 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "public_key" ("id" varchar(255) not null, "key" varchar(788) not null, "expires" timestamptz(0) not null);');
    this.addSql('alter table "public_key" add constraint "public_key_pkey" primary key ("id");');
    this.addSql('alter table "public_key" add constraint "public_key_key_unique" unique ("key");');

    this.addSql('create table "access_token" ("token" varchar(600) not null, "user_id" varchar(255) not null, "expires" timestamptz(0) not null, "public_key_id" varchar(255) not null);');
    this.addSql('alter table "access_token" add constraint "access_token_pkey" primary key ("token");');

    this.addSql('alter table "access_token" add constraint "access_token_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;');
    this.addSql('alter table "access_token" add constraint "access_token_public_key_id_foreign" foreign key ("public_key_id") references "public_key" ("id") on update cascade;');
  }

}
