import dotenv from 'dotenv';
import Router from './Router';
import EiNoah from './EiNoah';
import LobbyRouter from './routes/LobbyRouter';

dotenv.config();

const initialRouter = new Router();
initialRouter.use('lobby', LobbyRouter);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const eiNoah = new EiNoah(process.env.CLIENT_TOKEN, initialRouter);
