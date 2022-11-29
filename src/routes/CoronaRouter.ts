import moment from 'moment';
import parse from 'csv-parse/lib/sync';
import {
  Client, Collection, ApplicationCommandOptionType, ButtonStyle, Message, ActionRowBuilder, MessageActionRowComponentBuilder, ButtonBuilder, AttachmentBuilder,
} from 'discord.js';
import { MikroORM } from '@mikro-orm/core';
import { PostgreSqlDriver, EntityManager } from '@mikro-orm/postgresql';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import Chart, { ChartConfiguration } from 'chart.js';
import { i18n as I18n } from 'i18next';
import stringSimilarity from 'string-similarity';
import { CronJob } from 'cron';
import { Logger } from 'winston';
import UserCoronaRegions from '../entity/UserCoronaRegions';
import Router, { BothAutocompleteHandler, BothHandler, HandlerType } from '../router/Router';
import { createEntityCache } from '../EiNoah';
import CoronaData, { CoronaInfo } from '../entity/CoronaData';

// eslint-disable-next-line @typescript-eslint/no-implied-eval, no-new-func
const fetch = Function('return import("node-fetch")')() as Promise<typeof import('node-fetch')>;

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

let communityList : string[] | null = null;
const loadCommunityList = async (em : EntityManager) => {
  if (!communityList) {
    const newItems : string[] = (await em.createQueryBuilder(CoronaData, 'cd', 'read')
      .select(['community'], true)
      .execute())
      .map((item) => item.community);

    if (newItems.length !== 0) {
      communityList = newItems;
    }

    return newItems;
  }

  return communityList;
};

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

  await loadCommunityList(em);

  if (!communityList) return 'Corona data is nog niet opgehaald';

  const coronaReport = communityList
    .find((c) => c.toLowerCase() === region.toLowerCase());
  if (!coronaReport) {
    return `${region} is niet een regio`;
  }

  const newRegion = new UserCoronaRegions();

  newRegion.region = coronaReport;
  newRegion.user = user;

  em.persist(newRegion);

  return `${coronaReport} is toegevoegd aan je dagelijkse rapport`;
};

const communityAutocompleteHandler : BothAutocompleteHandler = async ({ em, flags }) => {
  const [inputCommunity] = flags.get('region') || [];
  if (typeof inputCommunity !== 'string') return [{ name: 'Not a string', value: 'notAString' }];

  const itemsSorted = (await loadCommunityList(em))
    .sort((a, b) => stringSimilarity.compareTwoStrings(inputCommunity.toLowerCase(), b.toLowerCase()) - stringSimilarity.compareTwoStrings(inputCommunity.toLowerCase(), a.toLowerCase()));
  const collection = new Collection([...itemsSorted.entries()]);

  return collection.first(25).map((item) => ({ name: item, value: item }));
};

router.use('add', addHandler, HandlerType.BOTH, {
  description: 'Voeg een regio/gemeente toe',
  options: [{
    name: 'region',
    description: 'Regio die je wil toevoegen',
    type: ApplicationCommandOptionType.String,
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
    type: ApplicationCommandOptionType.String,
    autocomplete: true,
    required: true,
  }],
}, removeAutocompleteHandler);
router.use('verwijder', removeHandler);
router.use('delete', removeHandler);

const getPopulation = async () => {
  const population : { [key: string]: number | undefined } = {};

  const rawData = (await fetch.then(({ default: f }) => f('https://opendata.cbs.nl/CsvDownload/csv/03759ned/TypedDataSet?dl=41EB0')).then((res) => res.text()))
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
  ZeerErnstig = 'Zeer Ernstig',
}

interface CoronaDataManipulated {
  date: Date,
  community: string,
  total_reported: string
  deceased: string
}

const getRollingData = (em: EntityManager, communities : string[]) : Promise<CoronaDataManipulated[]> => {
  const query = em.createQueryBuilder(CoronaData, 'cd', 'read')
    .raw(`SELECT community, date, sum(total_reported) over(partition by community order by date rows between 6 preceding and current row) as total_reported, sum(deceased) over(partition by community order by date rows between 6 preceding and current row) as deceased from corona_data where lower(community) IN (${communities.map(() => '?').join(',')}) order by date`, ...[communities.map((c) => c.toLowerCase())]);

  return em.execute<CoronaDataManipulated[]>(query);
};

const getCumulative = (em : EntityManager, communities : string[]) : Promise<CoronaDataManipulated[]> => {
  const query = em.createQueryBuilder(CoronaData, 'cd', 'read')
    .raw(`SELECT community, date, sum(total_reported) over(partition by community order by date) as total_reported, sum(deceased) over(partition by community order by date) as deceased from corona_data where lower(community) IN (${communities.map(() => '?').join(',')}) order by date`, ...[communities.map((c) => c.toLowerCase())]);

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
  showDeaths ?: boolean
}

const generateGraph = ({
  data,
  days = 7,
  displayLabels = false,
  i18n,
  showCases = true, showDeaths = false,
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
  const [showDeaths] = flags.get('show-deceased') || [false];

  if (typeof community !== 'string') return 'Community moet een gemeente zijn en niet een random string';
  if (typeof days !== 'number') return 'Last-days moet een nummer zijn';
  if (typeof labels !== 'boolean') return 'Labels moet van type boolean zijn (true/false)';
  if (typeof cumulative !== 'boolean') return 'Cumulative moet van type boolean zijn (true/false)';
  if (typeof showCases !== 'boolean') return 'Show-cases moet van type boolean zijn (true/false)';
  if (typeof showDeaths !== 'boolean') return 'Show-deceased moet van type boolean zijn (true/false)';

  if (!showCases && !showDeaths) return 'Er moet een dataset geselecteerd zijn';

  const data = cumulative ? await getCumulative(em, [community]) : await getRollingData(em, [community]);
  // const last30days = allData.filter((d) => d.date.getTime() > moment().subtract(1, 'month').toDate().getTime());

  if (!data.length) return `${community} is niet een gemeente`;

  return {
    files: [new AttachmentBuilder(await generateGraph({
      data, days, displayLabels: labels, i18n, showCases, showDeaths,
    }))],
  };
};

router.use('graph', coronaGraph, HandlerType.BOTH, {
  description: 'Genereer een grafiekje :)',
  options: [{
    name: 'region',
    type: ApplicationCommandOptionType.String,
    description: 'Gemeente waarvan je een grafiekje wil zien',
    required: true,
    autocomplete: true,
  }, {
    name: 'days',
    type: ApplicationCommandOptionType.Integer,
    description: 'Laatste zoveel dagen',
  }, {
    name: 'labels',
    type: ApplicationCommandOptionType.Boolean,
    description: 'Laat de labels zien',
  }, {
    name: 'cumulative',
    type: ApplicationCommandOptionType.Boolean,
    description: 'Tel alle getallen van de datum terug op (i.p.v. alleen de laatste 7 dagen)',
  }, {
    name: 'show-cases',
    type: ApplicationCommandOptionType.Boolean,
    description: 'Laat gevallen zien',
  }, {
    name: 'show-deceased',
    type: ApplicationCommandOptionType.Boolean,
    description: 'Laat sterftegevallen zien',
  }],
}, communityAutocompleteHandler);

router.onInit = (client, orm) => {
  client.on('interactionCreate', async (interaction) => {
    const em = orm.em.fork();
    if (!interaction.isButton()) return;
    if (interaction.customId !== 'corona-remove-all') return;

    const { getUser } = createEntityCache(em);

    const user = await getUser(interaction.user);

    await user.coronaRegions.init();
    user.coronaRegions.getItems().forEach((cr) => {
      em.remove(cr);
    });

    await em.flush();

    await interaction.reply({ content: 'Voortaan krijg je geen corona updates meer', ephemeral: false });
    if (interaction.message instanceof Message) await interaction.message.edit({ components: [] });
  });
};

const coronaRefresher = async (client : Client, orm : MikroORM<PostgreSqlDriver>, logger : Logger) => {
  const regionPopulations = await getPopulation();

  const postReport = async () => {
    const em = orm.em.fork();
    logger.info('Posting report');

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

    const groupedUsers : { [key : string]: UserCoronaRegions[] } = {};
    userRegions.forEach((userRegion) => {
      if (groupedUsers[userRegion.user.id]) groupedUsers[userRegion.user.id].push(userRegion);
      else groupedUsers[userRegion.user.id] = [userRegion];
    });

    Object.keys(groupedUsers).forEach(async (key) => {
      const regions = groupedUsers[key];
      const graphs : Promise<AttachmentBuilder>[] = [];

      const reports = regions.map((r) => {
        const rollingData = rollingDataPerRegion.get(r.region.toLowerCase());
        const population = regionPopulations[r.region.toLowerCase()] || regionPopulations[`${r.region.toLowerCase()} (gemeente)`];

        if (!rollingData || !population) return `Er is iets fout gegaan bij het weergeven van ${r.region}`;
        graphs.push(generateGraph({ data: rollingData, days: 30, displayLabels: true }).then((buffer) => new AttachmentBuilder(buffer, { name: `${r.region}_graph_${moment(rollingData[0].date).format('DD-MM-YYYY')}.png` })));

        const weeklyCount = rollingData[rollingData.length - 1];

        const cases = Number.parseInt(weeklyCount.total_reported, 10);
        const deceased = Number.parseInt(weeklyCount.deceased, 10);

        const casesPer = Math.ceil((cases / population) * 100_000);
        const deceasedPer = Math.ceil((deceased / population) * 100_000);

        let niveau : Niveau;

        if (casesPer < 50) niveau = Niveau.Waakzaam;
        else if (casesPer <= 150) niveau = Niveau.Zorgelijk;
        else if (casesPer <= 250) niveau = Niveau.Ernstig;
        else niveau = Niveau.ZeerErnstig;

        let message = `**${r.region}${casesPer ? ` (${niveau})` : ''}**`;
        message += `\nNieuwe gevallen: ${cases}`;
        if (casesPer) message += ` (${casesPer} / 100,000 per week)`;
        message += `\nSterfte: ${deceased}`;
        if (deceasedPer) message += ` (${deceasedPer} / 100,000 per week)`;

        return message;
      });

      const row = new ActionRowBuilder<MessageActionRowComponentBuilder>();
      row.addComponents([
        new ButtonBuilder()
          .setStyle(ButtonStyle.Secondary)
          .setCustomId('corona-remove-all')
          .setLabel('Uitschrijven van alles')
          .setEmoji({ name: '❌' }),
      ]);

      const report = `*Corona cijfers deze week (**dikgedrukt** betekent boven signaalwaarde)*\n${reports.join('\n')}\n> Cijfers liggen in werkelijkheid hoger`;
      await client.users.fetch(`${BigInt(groupedUsers[key][0].user.id)}`, { cache: true })
        .then(async (user) => user.send({ content: report, files: await Promise.all(graphs), components: [row] }))
        .catch(() => {});
    });
  };

  const refreshData = async () => {
    const em = orm.em.fork();

    logger.info(`${moment().format('HH:mm')}: corona fetch started`);

    try {
      const inDb = await em.getRepository(CoronaData).findAll();
      const fetchedData = <CoronaInfo[]>(await fetch.then(({ default: f }) => f('https://data.rivm.nl/covid-19/COVID-19_aantallen_gemeente_per_dag.json')).then((res) => res.json()));

      let oldestRecord : CoronaData | undefined;
      inDb.forEach((cd) => {
        if (oldestRecord === undefined || cd.date.getTime() > oldestRecord?.date.getTime()) {
          oldestRecord = cd;
        }
      });

      const coronaData = fetchedData
        .map((info) => new CoronaData(info))
        .filter(
          (data) => data.community !== null
          && data.community !== undefined
          && data.deceased !== null
          && data.deceased !== undefined
          && data.totalReported !== null
          && data.totalReported !== undefined,
        )
        .filter(((cd) => oldestRecord === undefined || cd.date.getTime() > oldestRecord.date.getTime()))
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
        logger.info(`${moment().format('HH:mm')}: ${duplicatesRemoved.length} new corona_data rows discovered`);
        em.persist(duplicatesRemoved);
        await em.flush();
        logger.info(`${moment().format('HH:mm')}: ${duplicatesRemoved.length} new corona_data rows added to db`);

        await postReport();
      } else {
        logger.info(`${moment().format('HH:mm')}: no new data`);
      }
    } catch (err) { logger.error(err); }
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
