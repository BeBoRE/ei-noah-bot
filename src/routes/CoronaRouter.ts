import fetch from 'node-fetch';
import moment from 'moment';
import Router from '../Router';
import CoronaData, { CoronaInfo } from '../entity/CoronaData';

const router = new Router();

router.use(null, async ({ msg }) => {
  msg.channel.send('a');
});

router.onInit = async (client, orm) => {
  const refreshData = async () => {
    const em = orm.em.fork();

    const inDb = await em.getRepository(CoronaData).findAll();
    const fetchedData = <CoronaInfo[]>(await fetch('https://data.rivm.nl/covid-19/COVID-19_aantallen_gemeente_per_dag.json').then((res) => res.json()));

    const coronaData = fetchedData
      .map((info) => new CoronaData(info))
      .filter((data) => data.community !== null)
      .filter((data) => !inDb
        .some((db) => db.community === data.community
          && db.date.getTime() === data.date.getTime()));

    const duplicatesRemoved : CoronaData[] = [];
    coronaData.forEach((data) => {
      const duplicate = duplicatesRemoved
        .find((item) => item.community === data.community
        && item.date.getTime() === data.date.getTime());

      if (!duplicate) duplicatesRemoved.push(data);
    });

    if (duplicatesRemoved.length > 0) { console.log(`${moment().format('HH:mm')}: ${duplicatesRemoved.length} new corona_data rows`); }

    em.persist(duplicatesRemoved);

    await em.flush();

    setTimeout(() => refreshData, 1000 * 60 * 60 * 3);
  };

  refreshData();
};

export default router;
