import fetch from 'node-fetch';
import moment from 'moment';
import Router from '../Router';

const router = new Router();

interface CoronaInfo {
  Date_of_publication: string
  Municipality_name: string
  Province: string
  Total_reported: number
  Hospital_admission: number
  Deceased: number
}

router.use(null, async ({ msg }) => {
  const data = <CoronaInfo[]>(await fetch('https://data.rivm.nl/covid-19/COVID-19_aantallen_gemeente_per_dag.json').then((res) => res.json()));

  const today = moment().format('YYYY-MM-DD');

  const zwartewaterland = data.filter((info) => info.Municipality_name === 'Zwartewaterland' && info.Date_of_publication === '2020-10-04');
  const report = zwartewaterland.map((info) => `${info.Date_of_publication}: ${info.Total_reported}`).join('\n');

  msg.channel.send(report, { split: true });
});

export default router;
