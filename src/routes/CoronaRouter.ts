import fetch from 'node-fetch';
import moment from 'moment';
import parse from 'csv-parse/lib/sync';
import { Client, MessageAttachment, Collection } from 'discord.js';
import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver, EntityManager } from '@mikro-orm/postgresql';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart, { ChartConfiguration } from 'chart.js';
import { i18n as I18n } from 'i18next';
import stringSimilarity from 'string-similarity';
import { CronJob } from 'cron';
import UserCoronaRegions from '../entity/UserCoronaRegions';
import Router, { BothAutocompleteHandler, BothHandler, HandlerType } from '../router/Router';
import CoronaData, { CoronaInfo } from '../entity/CoronaData';

const router = new Router('Krijg iedere morgen een rapportage over de locale corona situatie');

const helpHandler : BothHandler = () => [
  '**Krijg iedere morgen een rapportage over de locale corona situatie**',
  'Mogelijke Commandos:',
  '`/corona add <regio>`: Voeg een regio toe aan je dagelijkse rapportage',
  '`/corona remove <regio>`: Verwijder een regio van je dagelijkse rapportage',
  '`/corona graph <region>`: Laat een grafiek zien van de corona-gevallen binnen een gegeven regio en tijd',
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
  if (!user.coronaRegions.isInitialized()) { await user.coronaRegions.init(); }
  const currentRegions = user.coronaRegions.getItems()
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
  newRegion.user = user;

  em.persist(newRegion);

  return `${coronaReport.community} is toegevoegd aan je dagelijkse rapport`;
};

let communityList : string[] | null = null;
const communityAutocompleteHandler : BothAutocompleteHandler = async ({ em, flags }) => {
  const [inputCommunity] = flags.get('region') || [];
  if (typeof inputCommunity !== 'string') return [{ name: 'Not a string', value: 'notAString' }];

  if (!communityList) {
    const newItems : {community : string}[] = (await em.createQueryBuilder(CoronaData, 'cd', 'read')
      .select(['community'], true)
      .execute());

    communityList = newItems
      .map((item) => item.community);
  }

  const itemsSorted = communityList
    .sort((a, b) => stringSimilarity.compareTwoStrings(inputCommunity.toLowerCase(), b.toLowerCase()) - stringSimilarity.compareTwoStrings(inputCommunity.toLowerCase(), a.toLowerCase()));
  const collection = new Collection([...itemsSorted.entries()]);

  return collection.first(25).map((item) => ({ name: item, value: item }));
};

router.use('add', addHandler, HandlerType.BOTH, {
  description: 'Voeg een regio/gemeente toe',
  options: [{
    name: 'region',
    description: 'Regio die je wil toevoegen',
    type: 'STRING',
    required: true,
    autocomplete: true,
  }],
}, communityAutocompleteHandler);
router.use('toevoegen', addHandler);

const removeHandler : BothHandler = async ({
  user, params, em, flags,
}) => {
  const regionRaw = flags.get('region') || params;

  if (!regionRaw.every((param) : param is string => typeof param === 'string')) {
    return 'Jij denkt dat een persoon een regio is?';
  }

  const region = regionRaw.filter((param) : param is string => typeof param === 'string').join(' ');
  if (!user.coronaRegions.isInitialized()) { await user.coronaRegions.init(); }
  const dbRegion = user.coronaRegions.getItems()
    .find((r) => r.region.toLowerCase() === region.toLowerCase());

  if (!dbRegion) {
    return 'Je hebt deze regio nog niet toegevoegd';
  }

  em.remove(dbRegion);

  return `${dbRegion.region} is verwijderd van je dagelijkse rapport`;
};

const removeAutocompleteHandler : BothAutocompleteHandler = async ({ flags, user }) => {
  const [inputCommunity] = flags.get('region') || [];
  if (typeof inputCommunity !== 'string') return [{ name: 'Not a string', value: 'notAString' }];

  if (!user.coronaRegions.isInitialized()) await user.coronaRegions.init();
  const collection = new Collection([...user.coronaRegions.getItems().entries()]);

  return collection.sort((a, b) => stringSimilarity.compareTwoStrings(inputCommunity.toLowerCase(), b.region.toLowerCase()) - stringSimilarity.compareTwoStrings(inputCommunity.toLowerCase(), a.region.toLowerCase()))
    .first(25)
    .map((item) => ({ name: item.region, value: item.region }));
};

router.use('remove', removeHandler, HandlerType.BOTH, {
  description: 'Verwijder een regio/gemeente',
  options: [{
    name: 'region',
    description: 'Regio/gemeente die je wil verwijderen',
    type: 'STRING',
    autocomplete: true,
    required: true,
  }],
}, removeAutocompleteHandler);
router.use('verwijder', removeHandler);
router.use('delete', removeHandler);

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
  Zorgelijk = 'Zorgelijk',
  Ernstig = 'Ernstig',
  ZeerErnstig = 'Zeer Ernstig'
}

interface CoronaDataManipulated {
  date: Date,
  community: string,
  total_reported: string
  hospital_admissions: string,
  deceased: string
}

const getRollingData = (em: EntityManager, communities : string[]) : Promise<CoronaDataManipulated[]> => {
  const query = em.createQueryBuilder(CoronaData, 'cd', 'read')
    .raw(`SELECT community, date, sum(total_reported) over(partition by community order by date rows between 6 preceding and current row) as total_reported, sum(deceased) over(partition by community order by date rows between 6 preceding and current row) as deceased, sum(hospital_admissions) over(partition by community order by date rows between 6 preceding and current row) as hospital_admissions from corona_data where lower(community) IN (${communities.map(() => '?').join(',')}) order by date`, ...[communities.map((c) => c.toLowerCase())]);

  return em.execute<CoronaDataManipulated[]>(query);
};

const getCumulative = (em : EntityManager, communities : string[]) : Promise<CoronaDataManipulated[]> => {
  const query = em.createQueryBuilder(CoronaData, 'cd', 'read')
    .raw(`SELECT community, date, sum(total_reported) over(partition by community order by date) as total_reported, sum(deceased) over(partition by community order by date) as deceased, sum(hospital_admissions) over(partition by community order by date) as hospital_admissions from corona_data where lower(community) IN (${communities.map(() => '?').join(',')}) order by date`, ...[communities.map((c) => c.toLowerCase())]);

  return em.execute<CoronaDataManipulated[]>(query);
};

const scale = 1;
const canvas = new ChartJSNodeCanvas({ width: 800 * scale, height: 400 * scale });
canvas.registerFont('./fonts/Roboto-Regular.ttf', {
  family: 'Roboto Regular',
});
canvas.registerFont('./fonts/Roboto-Bold.ttf', {
  family: 'Roboto Bold',
});
canvas.registerFont('./fonts/Roboto-Black.ttf', {
  family: 'Roboto Black',
});

interface GraphOptions {
  data: CoronaDataManipulated[],
  days: number,
  displayLabels : boolean,
  i18n ?: I18n
  showCases ?: boolean,
  showAdmissions ?: boolean,
  showDeaths ?: boolean
}

const generateGraph = ({
  data,
  days = 7,
  displayLabels = false,
  i18n,
  showCases = true, showAdmissions = false, showDeaths = false,
} : GraphOptions) => {
  const collection = new Collection(data.entries());
  const datasets : Chart.ChartDataSets[] = [];

  if (showCases) {
    datasets.push({
      label: 'Gevallen',
      data: collection.last(days).map((value) => Number.parseInt(value.total_reported, 10)),
      backgroundColor: '#ffcc5f11',
      borderColor: '#ffcc5f',
      borderWidth: 3 * scale,
    });
  }

  if (showAdmissions) {
    datasets.push({
      label: 'Ziekenhuis Opnames',
      data: collection.last(days).map((value) => Number.parseInt(value.hospital_admissions, 10)),
      backgroundColor: '#03fcfc11',
      borderColor: '#03fcfc',
      borderWidth: 3 * scale,
    });
  }

  if (showDeaths) {
    datasets.push({
      label: 'Doden',
      data: collection.last(days).map((value) => Number.parseInt(value.deceased, 10)),
      backgroundColor: '#91090911',
      borderColor: '#910909',
      borderWidth: 3 * scale,
    });
  }

  if (!datasets.length) throw Error('Can\'t generate a graph without data');

  const configuration : ChartConfiguration = {
    type: 'line',
    data: {
      labels: collection.last(days).map((value) => moment(value.date).locale(i18n?.language || 'nl').format(days < 90 ? 'DD' : 'DD MMMM')),
      datasets,
    },
    options: {
      title: {
        display: true,
        text: collection.first()?.community,
        fontColor: '#FFFFFF',
        fontSize: 32 * scale,
        fontFamily: 'Roboto Bold, sans-serif',
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
            fontSize: 16 * scale,
            fontFamily: 'Roboto Black, sans-serif',
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
            fontSize: 16 * scale,
            fontFamily: 'Roboto Black, sans-serif',
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

const coronaGraph : BothHandler = async ({
  em, params, flags, i18n,
}) => {
  const [community] = flags.get('region') || params;
  const [days] = flags.get('days') || [30];
  const [labels] = flags.get('labels') || [true];
  const [cumulative] = flags.get('cumulative') || [false];
  const [showCases] = flags.get('show-cases') || [true];
  const [showAdmissions] = flags.get('show-admissions') || [false];
  const [showDeaths] = flags.get('show-deaths') || [false];

  if (typeof community !== 'string') return 'Community moet een gemeente zijn en niet een random string';
  if (typeof days !== 'number') return 'Last-days moet een nummer zijn';
  if (typeof labels !== 'boolean') return 'Labels moet van type boolean zijn (true/false)';
  if (typeof cumulative !== 'boolean') return 'Cumulative moet van type boolean zijn (true/false)';
  if (typeof showCases !== 'boolean') return 'Show-cases moet van type boolean zijn (true/false)';
  if (typeof showAdmissions !== 'boolean') return 'Show-admissions moet van type boolean zijn (true/false)';
  if (typeof showDeaths !== 'boolean') return 'Show-deaths moet van type boolean zijn (true/false)';

  if (!showCases && !showAdmissions && !showDeaths) return 'Er moet een dataset geselecteerd zijn';

  const data = cumulative ? await getCumulative(em, [community]) : await getRollingData(em, [community]);
  // const last30days = allData.filter((d) => d.date.getTime() > moment().subtract(1, 'month').toDate().getTime());

  if (!data.length) return `${community} is niet een gemeente`;

  return new MessageAttachment(await generateGraph({
    data, days, displayLabels: labels, i18n, showCases, showAdmissions, showDeaths,
  }));
};

router.use('graph', coronaGraph, HandlerType.BOTH, {
  description: 'Genereer een grafiekje :)',
  options: [{
    name: 'region',
    type: 'STRING',
    description: 'Gemeente waarvan je een grafiekje wil zien',
    required: true,
    autocomplete: true,
  }, {
    name: 'days',
    type: 'INTEGER',
    description: 'Laatste zoveel dagen',
  }, {
    name: 'labels',
    type: 'BOOLEAN',
    description: 'Laat de labels zien',
  }, {
    name: 'cumulative',
    type: 'BOOLEAN',
    description: 'Tel alle getallen van de datum terug op (i.p.v alleen de laatste 7 dagen)',
  }, {
    name: 'show-cases',
    type: 'BOOLEAN',
    description: 'Laat gevallen zien',
  }, {
    name: 'show-admissions',
    type: 'BOOLEAN',
    description: 'Laat ziekenhuis opnamens zien',
  }, {
    name: 'show-deaths',
    type: 'BOOLEAN',
    description: 'Laat gevallen zien',
  }],
}, communityAutocompleteHandler);

const coronaRefresher = async (client : Client, orm : MikroORM<PostgreSqlDriver>) => {
  const regionPopulations = await getPopulation();

  const postReport = async () => {
    const em = orm.em.fork();
    console.log('Posting report');

    const userRegions = await em.getRepository(UserCoronaRegions).findAll();

    const allRollingData = await getRollingData(em, userRegions.map((ur) => ur.region));

    if (allRollingData.length === 0) return;

    const rollingDataPerRegion = new Map<string, CoronaDataManipulated[]>();
    allRollingData.forEach((report) => {
      const currentArray = rollingDataPerRegion.get(report.community.toLowerCase());
      if (currentArray) {
        currentArray.push(report);
      } else rollingDataPerRegion.set(report.community.toLowerCase(), [report]);
    });

    const groupedUsers : {[key : string]: UserCoronaRegions[]} = {};
    userRegions.forEach((userRegion) => {
      if (groupedUsers[userRegion.user.id]) groupedUsers[userRegion.user.id].push(userRegion);
      else groupedUsers[userRegion.user.id] = [userRegion];
    });

    Object.keys(groupedUsers).forEach(async (key) => {
      const regions = groupedUsers[key];
      const graphs : Promise<MessageAttachment>[] = [];

      const reports = regions.map((r) => {
        const rollingData = rollingDataPerRegion.get(r.region.toLowerCase());
        const population = regionPopulations[r.region.toLowerCase()] || regionPopulations[`${r.region.toLowerCase()} (gemeente)`];

        if (!rollingData || !population) return `Er is iets fout gegaan bij het weergeven van ${r.region}`;
        graphs.push(generateGraph({ data: rollingData, days: 30, displayLabels: true }).then((buffer) => new MessageAttachment(buffer, `${r.region}_graph_${moment(rollingData[0].date).format('DD-MM-YYYY')}.png`)));

        const weeklyCount = rollingData[rollingData.length - 1];

        const cases = Number.parseInt(weeklyCount.total_reported, 10);
        const hospital = Number.parseInt(weeklyCount.hospital_admissions, 10);
        const deceased = Number.parseInt(weeklyCount.deceased, 10);

        const casesPer = Math.ceil((cases / population) * 100_000);
        const hospitalPer = Math.ceil((hospital / population) * 100_000);
        const deceasedPer = Math.ceil((deceased / population) * 100_000);

        let niveau : Niveau;

        if (casesPer < 50) niveau = Niveau.Waakzaam;
        else if (casesPer <= 150) niveau = Niveau.Zorgelijk;
        else if (casesPer <= 250) niveau = Niveau.Ernstig;
        else niveau = Niveau.ZeerErnstig;

        let message = `**${r.region}${casesPer ? ` (${niveau})` : ''}**`;
        message += `\nNieuwe gevallen: ${cases}`;
        if (casesPer) message += ` (${casesPer} / 100,000 per week)`;
        message += `\nZiekenhuis Opnames: ${hospital}`;
        if (hospitalPer) message += ` (${hospitalPer} / 100,000 per week)`;
        message += `\nDoden: ${deceased}`;
        if (deceasedPer) message += ` (${deceasedPer} / 100,000 per week)`;

        return message;
      });

      const report = `*Corona cijfers deze week (**dikgedrukt** betekent boven signaalwaarde)*\n${reports.join('\n')}`;
      await client.users.fetch(`${BigInt(groupedUsers[key][0].user.id)}`, { cache: true })
        .then(async (user) => user.send({ content: report, files: await Promise.all(graphs) }))
        .catch(() => {});
    });
  };

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

        await postReport();
      } else {
        console.log(`${moment().format('HH:mm')}: no new data`);
      }
    } catch (err) { console.log(err); }
  };

  const refreshDataCron = new CronJob('0 16 * * *', refreshData, null, false, 'Europe/Amsterdam');
  refreshDataCron.start();

  if (process.env.REFRESH_DATA?.toLowerCase() !== 'false') {
    refreshData();
  }

  // const reportCron = new CronJob('0 9 * * *', postReport);

  if (process.env.POST_RAPPORT?.toLowerCase() === 'true') postReport();

  // reportCron.start();
};

export default router;
export { coronaRefresher };
