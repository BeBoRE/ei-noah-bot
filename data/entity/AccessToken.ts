import {
  Entity, ManyToOne, PrimaryKey, Property,
} from '@mikro-orm/core';
// eslint-disable-next-line import/no-cycle
import crypto from 'crypto';
import moment from 'moment';
// eslint-disable-next-line import/no-cycle
import PublicKey from './PublicKey';
import { User } from './User';

@Entity()
class AccessToken {
  constructor(user : User, publicKey : PublicKey) {
    this.token = crypto.randomBytes(128).toString('base64');
    this.expires = moment().add(10, 'minutes').toDate();
    this.user = user;
    this.publicKey = publicKey;
  }

  @PrimaryKey({ length: 600 })
  token!: string;

  @ManyToOne()
  user!: User;

  @Property()
  expires!: Date;

  @ManyToOne()
  publicKey!: PublicKey;
}

export default AccessToken;
