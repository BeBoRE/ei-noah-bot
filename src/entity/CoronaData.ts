import {
  BaseEntity, Entity, PrimaryKey, Property, Unique,
} from '@mikro-orm/core';

export interface CoronaInfo {
  Date_of_publication: string
  Municipality_name: string
  Province: string
  Total_reported: number
  Hospital_admission: number
  Deceased: number
}

@Entity()
@Unique({ properties: ['date', 'community'] })
class CoronaData extends BaseEntity<CoronaData, 'id'> {
  constructor(coronaInfo : CoronaInfo) {
    super();
    this.community = coronaInfo.Municipality_name;
    this.totalReported = coronaInfo.Total_reported;
    this.deceased = coronaInfo.Deceased;

    this.date = new Date(coronaInfo.Date_of_publication);
  }

  @PrimaryKey()
    id!: number;

  @Property()
    date!: Date;

  @Property()
    community!: string;

  @Property()
    totalReported!: number;

  @Property()
    deceased!: number;
}

export default CoronaData;
