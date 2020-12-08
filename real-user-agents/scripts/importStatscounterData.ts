import moment from 'moment';
import axios from 'axios';
import csvParser from 'csv-parser';
import fs from 'fs';

const dataDir = `${__dirname}/../data/statcounter/`;

export default async function importStatscounterData() {
  const query = {
    device_hidden: ['desktop'].join('+'),
    region_hidden: 'US',
    granularity: 'monthly',
    'multi-device': true,
    csv: 1,
    fromMonthYear: moment()
      .subtract(1, 'month')
      .format('YYYY-MM'),
    toMonthYear: moment().format('YYYY-MM'),
  };
  const stats = ['os_combined', 'macos_version', 'windows_version', 'browser_version'];
  for (const stat of stats) {
    const results: { [entry: string]: [string, string] } = {};
    const response = await axios.get('https://gs.statcounter.com/chart.php', {
      params: {
        ...query,
        statType_hidden: stat,
      },
      responseType: 'stream',
    });
    response.data
      .pipe(csvParser())
      .on('data', res => {
        const slot = res.Date === query.fromMonthYear ? 0 : 1;
        for (const [entry, pct] of Object.entries(res)) {
          if (entry === 'Date') continue;
          if (!results[entry]) results[entry] = ['-1', '-1'];
          results[entry][slot] = pct as string;
        }
      })
      .on('end', () => {
        console.log(stat, results);
        fs.writeFileSync(
          `${dataDir}${stat}.json`,
          JSON.stringify(
            {
              fromMonthYear: query.fromMonthYear,
              toMonthYear: query.toMonthYear,
              lastModified: new Date(),
              results,
            },
            null,
            2,
          ),
        );
      });
  }
}
