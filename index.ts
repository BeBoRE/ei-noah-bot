import dotenv from 'dotenv';
import EiNoah from './EiNoah';
import LobbyRouter from './routes/LobbyRouter';

dotenv.config();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const eiNoah = new EiNoah(process.env.CLIENT_TOKEN);
eiNoah.use('lobby', LobbyRouter);

eiNoah.start();
