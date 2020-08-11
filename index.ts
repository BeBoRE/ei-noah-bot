import dotenv from 'dotenv';
import EiNoah from './EiNoah';

dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const eiNoah = new EiNoah(process.env.CLIENT_TOKEN);
