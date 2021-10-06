import fetch from 'node-fetch';
import moment from 'moment';
import { CronJob } from 'cron';
import parse from 'csv-parse/lib/sync';
import { Client, MessageAttachment, Collection } from 'discord.js';
import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';
import UserCoronaRegions from '../entity/UserCoronaRegions';
import Router, { BothHandler, HandlerType } from '../router/Router';
import CoronaData, { CoronaInfo } from '../entity/CoronaData';

const router = new Router('Krijg iedere morgen een rapportage over de locale corona situatie');

const helpHandler : BothHandler = () => [
  '**Krijg iedere morgen een rapportage over de locale corona situatie**',
  'Mogelijke Commandos:',
  '`/corona regions`: Vraag alle mogelijke regio\'s op',
  '`/corona add <regio>`: Voeg een regio toe aan je dagelijkse rapportage',
  '`/corona remove <regio>`: Verwijder een regio van je dagelijkse rapportage',
].join('\n');

router.use('help', helpHandler, HandlerType.BOTH, {
  description: 'Krijg een help menu',
});

const addHandler : BothHandler = async ({
  user, params, em, flags,
}) => {
  const regionRaw = flags.get('region') || params;

  if (!regionRaw.every((param) : param is string => typeof param === 'string')) {
    return 'Jij denkt dat een persoon een regio is?';
  }

  const region = regionRaw.filter((param) : param is string => typeof param === 'string').join(' ');
  if (!(await user).coronaRegions.isInitialized()) { await (await user).coronaRegions.init(); }
  const currentRegions = (await user).coronaRegions.getItems()
    .find((r) => r.region.toLowerCase() === region.toLowerCase());

  if (currentRegions) {
    return 'Deze regio is al toegevoegd';
  }

  const coronaReport = (await em.getRepository(CoronaData)
    .findAll({ limit: 500 }))
    .find((cr) => cr.community.toLowerCase() === region.toLowerCase());
  if (!coronaReport) {
    return `${region} is niet een regio`;
  }

  const newRegion = new UserCoronaRegions();

  newRegion.region = coronaReport.community;
  newRegion.user = await user;

  em.persist(newRegion);

  return `${coronaReport.community} is toegevoegd aan je dagelijkse rapport`;
};

router.use('add', addHandler, HandlerType.BOTH, {
  description: 'Voeg een regio/gemeente toe',
  options: [{
    name: 'region',
    description: 'Regio die je wil toevoegen',
    type: 'STRING',
    required: true,
  }],
});
router.use('toevoegen', addHandler);

const removeHandler : BothHandler = async ({
  user, params, em, flags,
}) => {
  const regionRaw = flags.get('region') || params;

  if (!regionRaw.every((param) : param is string => typeof param === 'string')) {
    return 'Jij denkt dat een persoon een regio is?';
  }

  const region = regionRaw.filter((param) : param is string => typeof param === 'string').join(' ');
  if (!(await user).coronaRegions.isInitialized()) { await (await user).coronaRegions.init(); }
  const dbRegion = (await user).coronaRegions.getItems()
    .find((r) => r.region.toLowerCase() === region.toLowerCase());

  if (!dbRegion) {
    return 'Je hebt deze regio nog niet toegevoegd';
  }

  em.remove(dbRegion);

  return `${dbRegion.region} is verwijderd van je dagelijkse rapport`;
};

router.use('remove', removeHandler, HandlerType.BOTH, {
  description: 'Verwijder een regio/gemeente',
  options: [{
    name: 'region',
    description: 'Regio/gemeente die je wil verwijderen',
    type: 'STRING',
    required: true,
  }],
});
router.use('verwijder', removeHandler);
router.use('delete', removeHandler);

const listRegionsHandler : BothHandler = async ({ em }) => {
  const coronaData = await em.getRepository(CoronaData).findAll({ limit: 500 });

  const regions = Array.from(new Set<string>(coronaData.map((data) => data.community)))
    .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

  if (regions.length === 0) return 'Regio\'s zijn nog niet geladen (dit kan nog 10 minuten duren)';

  return `Regio's:\n${regions.join('\n')}`;
};

router.use('gemeentes', listRegionsHandler, HandlerType.BOTH);
router.use('regions', listRegionsHandler, HandlerType.BOTH, {
  description: 'Geeft een lijst met regio\'s die je kan toevoegen',
});
router.use('steden', listRegionsHandler);
router.use('communities', listRegionsHandler);

const getPopulation = async () => {
  const population : {[key: string]: number | undefined} = {};

  const rawData = (await fetch('https://opendata.cbs.nl/CsvDownload/csv/03759ned/TypedDataSet?dl=41EB0').then((res) => res.text()))
    .replace(/"/g, '');

  const records = <Array<[string, string, string, string, string, string]>>parse(rawData, { delimiter: ';' });
  records.forEach((row) => {
    const amount = Number.parseInt(row[5], 10);
    if (Number.isInteger(amount) && row[0] === 'Totaal mannen en vrouwen') population[row[4].toLowerCase()] = amount;
  });

  return population;
};

enum Niveau {
  Waakzaam = 'Waakzaam',
  zorgelijk = 'Zorgelijk',
  ernstig = 'Ernstig',
  zeerernstig = 'Zeer Ernstig'
}

const canvas = new ChartJSNodeCanvas({ width: 800, height: 400 });

interface CoronaRollingData {
  date: Date,
  community: string,
  total_reported: string,
  total_last_week_reported: string
}

const generateGraph = (data : CoronaRollingData[], days = 7, displayLabels = false) => {
  const collection = new Collection(data.entries());

  const configuration : ChartConfiguration = {
    type: 'line',
    data: {
      labels: collection.last(days).map((value) => moment(value.date).format(days < 90 ? 'DD' : 'DD MMMM')),
      datasets: [{
        label: collection.first()?.community,
        data: collection.last(days).map((value) => Number.parseInt(value.total_last_week_reported, 10)),
        backgroundColor: '#ffcc5f11',
        borderColor: '#ffcc5f',
        borderWidth: 3,
      }],
    },
    options: {
      title: {
        display: true,
        text: collection.first()?.community,
        fontColor: '#FFFFFF',
        fontSize: 24,
      },
      plugins: {
        legend: false,
      },
      elements: {
        point: {
          radius: 0,
        },
      },
      scales: {
        xAxes: [{
          display: displayLabels,
          ticks: {
            fontColor: '#FFFFFF',
            fontSize: 14,
            fontStyle: 'bold',
          },
          gridLines: {
            display: false,
          },
        }],
        yAxes: [{
          display: displayLabels,
          ticks: {
            beginAtZero: true,
            fontColor: '#FFFFFF',
            fontSize: 14,
            fontStyle: 'bold',
          },
          gridLines: {
            display: false,
          },
        }],
      },
    },
  };

  return canvas.renderToBuffer(configuration, 'image/png');
};

const coronaGraph : BothHandler = async ({ em, params, flags }) => {
  const [community] = flags.get('community') || params;
  const [days] = flags.get('days') || [30];
  const [labels] = flags.get('labels') || [false];

  if (typeof community !== 'string') return 'Community moet een gemeente zijn en niet een random string';
  if (typeof days !== 'number') return 'Last-days moet een nummer zijn';
  if (typeof labels !== 'boolean') return 'Labels moet van type boolean zijn';

  const query = em.createQueryBuilder(CoronaData, 'cd', 'read').raw('SELECT community, date, total_reported, sum(total_reported) over(partition by community order by date rows between 6 preceding and current row) as total_last_week_reported from corona_data where lower(community) = lower(:community) order by date', {
    community,
  });

  const allData = await em.execute<CoronaRollingData[]>(query);
  // const last30days = allData.filter((d) => d.date.getTime() > moment().subtract(1, 'month').toDate().getTime());

  if (!allData.length) return `${community} is niet een gemeente`;

  return new MessageAttachment(await generateGraph(allData, days, labels));
};

router.use('graph', coronaGraph, HandlerType.BOTH, {
  description: 'Genereer een grafiekje :)',
  options: [{
    name: 'community',
    type: 'STRING',
    description: 'Gemeente waarvan je een grafiekje wil zien',
    required: true,
  }, {
    name: 'days',
    type: 'INTEGER',
    description: 'Laatste zoveel dagen',
  }, {
    name: 'labels',
    type: 'BOOLEAN',
    description: 'Laat de labels en gridlines zien',
  }],
});

const coronaRefresher = async (client : Client, orm : MikroORM<PostgreSqlDriver>) => {
  const regionPopulations = await getPopulation();

  const refreshData = async () => {
    const em = orm.em.fork();

    console.log(`${moment().format('HH:mm')}: corona fetch started`);

    try {
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

      if (duplicatesRemoved.length > 0) {
        console.log(`${moment().format('HH:mm')}: ${duplicatesRemoved.length} new corona_data rows discovered`);
        em.persist(duplicatesRemoved);
        await em.flush();
        console.log(`${moment().format('HH:mm')}: ${duplicatesRemoved.length} new corona_data rows added to db`);
      } else {
        console.log(`${moment().format('HH:mm')}: no new data`);
      }
    } finally {
      setTimeout(refreshData, 1000 * 60 * 60 * 3);
    }
  };

  const postReport = async () => {
    const em = orm.em.fork();

    const userRegions = await em.getRepository(UserCoronaRegions).findAll();

    const relevantReports = await em
      .find(CoronaData, { community: { $in: userRegions.map((region) => region.region) } });

    if (relevantReports.length === 0) return;

    const groupedReports : {[key : string]: CoronaData[]} = {};
    relevantReports.forEach((report) => {
      if (groupedReports[report.community.toLowerCase()]) {
        groupedReports[report.community.toLowerCase()].push(report);
      } else groupedReports[report.community.toLowerCase()] = [report];
    });

    interface WeeklyCoronaDataCounted {
      deceased: number
      totalReported: number
      hospitalized: number
    }

    const weeklyCountPerRegion : {[key : string]: WeeklyCoronaDataCounted} = {};

    Object.keys(groupedReports).forEach((key) => {
      groupedReports[key] = groupedReports[key]
        .sort((r1, r2) => r2.date.getTime() - r1.date.getTime());

      weeklyCountPerRegion[key] = { deceased: 0, hospitalized: 0, totalReported: 0 };

      for (let i = 0; i < 7; i += 1) {
        const currentReport = groupedReports[key][i];

        weeklyCountPerRegion[key].deceased += currentReport.deceased;
        weeklyCountPerRegion[key].hospitalized += currentReport.hospitalAdmissions;
        weeklyCountPerRegion[key].totalReported += currentReport.totalReported;
      }
    });

    const groupedUsers : {[key : string]: UserCoronaRegions[]} = {};
    userRegions.forEach((userRegion) => {
      if (groupedUsers[userRegion.user.id]) groupedUsers[userRegion.user.id].push(userRegion);
      else groupedUsers[userRegion.user.id] = [userRegion];
    });

    Object.keys(groupedUsers).forEach(async (key) => {
      const regions = groupedUsers[key];

      const reports = regions.map((r) => {
        const weeklyCount = weeklyCountPerRegion[r.region.toLowerCase()];
        const population = regionPopulations[r.region.toLowerCase()];

        const casesPer = population
          ? Math.round((weeklyCount.totalReported / population) * 100_000) : 0;
        const hospitalPer = population
          ? Math.round((weeklyCount.hospitalized / population) * 100_000) : 0;
        const deceasedPer = population
          ? Math.round((weeklyCount.deceased / population) * 100_000) : 0;

        let niveau : Niveau;

        if (casesPer < 50) niveau = Niveau.Waakzaam;
        else if (casesPer <= 150) niveau = Niveau.zorgelijk;
        else if (casesPer <= 250) niveau = Niveau.ernstig;
        else niveau = Niveau.zeerernstig;

        let message = `**${r.region} (${niveau})**`;
        message += `\nNieuwe gevallen: ${weeklyCount.totalReported}`;
        if (casesPer) message += ` (${casesPer} / 100,000 per week)`;
        message += `\nZiekenhuis Opnames: ${weeklyCount.hospitalized}`;
        if (hospitalPer) message += ` (${hospitalPer} / 100,000 per week)`;
        message += `\nDoden: ${weeklyCount.deceased}`;
        if (deceasedPer) message += ` (${deceasedPer} / 100,000 per week)`;

        return message;
      });

      const report = `*Corona cijfers deze week (**dikgedrukt** betekent boven signaalwaarde)*\n${reports.join('\n')}`;
      client.users.fetch(`${BigInt(groupedUsers[key][0].user.id)}`, { cache: true })
        .then((user) => user.send({ content: report }))
        .catch(() => {});
    });
  };

  if (process.env.REFRESH_DATA?.toLowerCase() !== 'false') {
    refreshData();
  }

  const reportCron = new CronJob('0 9 * * *', postReport);

  if (process.env.POST_RAPPORT?.toLowerCase() === 'true') postReport();

  reportCron.start();
};

export default router;
export { coronaRefresher };
