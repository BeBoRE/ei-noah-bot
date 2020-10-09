import { Migration } from 'mikro-orm';

export class Migration20201007193137 extends Migration {

  async up(): Promise<void> {
    this.addSql('create table "corona_data" ("id" serial primary key, "date" timestamptz(0) not null, "community" varchar(255) not null, "total_reported" int4 not null, "hospital_admissions" int4 not null, "deceased" int4 not null);');
    this.addSql('alter table "corona_data" add constraint "dateCommunity" unique ("date", "community");');

    this.addSql('create table "user_corona_regions" ("id" serial primary key, "user_id" varchar(255) not null, "region" varchar(255) not null);');
    this.addSql('alter table "user_corona_regions" add constraint "userRegion" unique ("user_id", "region");');

    this.addSql('alter table "user_corona_regions" add constraint "user_corona_regions_user_id_foreign" foreign key ("user_id") references "user" ("id") on update cascade;');
  }

}
