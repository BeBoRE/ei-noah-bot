import {
  Collection, Entity, OneToMany, PrimaryKey, Property,
} from '@mikro-orm/core';
// eslint-disable-next-line import/no-cycle
import AccessToken from './AccessToken';

@Entity()
export default class PublicKey {
  @PrimaryKey()
  id!: string;

  @Property({ unique: true, length: 788 })
  key!: string;

  @Property()
  expires!: Date;

  @OneToMany('AccessToken', 'publicKey')
  accessTokens = new Collection<AccessToken>(this);
}
