import * as Path from 'path';
import UserAgent from './lib/UserAgent';
import Browsers from './lib/Browsers';
import OperatingSystems from './lib/OperatingSystems';

export const FILE_PATH = Path.join(__dirname, './data/userAgentsById.json');

// LOAD DATA
let BY_ID: IUserAgentsById;
function loadById() {
  if (!BY_ID) {
    // eslint-disable-next-line global-require,import/no-dynamic-require
    BY_ID = require(FILE_PATH) as IUserAgentsById;
    Object.keys(BY_ID).forEach(id => (BY_ID[id] = UserAgent.load(BY_ID[id])));
  }
  return BY_ID;
}

export default class RealUserAgents {
  public static all(): UserAgent[] {
    return Object.values(loadById()).filter(userAgent => {
      const { name, version } = userAgent.browser;
      if (name === 'Chrome' && Number(version.major) < 58) return false;
      if (name === 'Edge' && Number(version.major) < 58) return false;
      if (name === 'Firefox' && Number(version.major) < 58) return false;
      if (name === 'Opera' && Number(version.major) < 58) return false;
      if (name === 'Safari' && Number(version.major) < 10) return false;
      if (name === 'IE') return false;
      return true;
    });
  }

  public static getId(userAgentId: string) {
    return loadById()[userAgentId];
  }

  public static where(query: { browserId?: string; operatingSystemId?: string }) {
    let userAgents = this.all();
    if (query.browserId) {
      userAgents = userAgents.filter(x => x.browserId === query.browserId);
    }
    if (query.operatingSystemId) {
      userAgents = userAgents.filter(x => x.operatingSystemId === query.operatingSystemId);
    }
    return userAgents;
  }

  public static findById(userAgentId: string) {
    if (!userAgentId) return;
    return loadById()[userAgentId];
  }

  public static random(countToGet: number, filterFn?: (userAgent: UserAgent) => boolean) {
    const availableUserAgents = this.all();
    const userAgentCount = availableUserAgents.length;

    const selectedUserAgents = [];
    while (selectedUserAgents.length < countToGet && selectedUserAgents.length < userAgentCount) {
      if (!availableUserAgents.length) break;
      const selectedIndex = Math.floor(Math.random() * availableUserAgents.length);
      const userAgent = availableUserAgents.splice(selectedIndex, 1)[0];
      if (filterFn && !filterFn(userAgent)) continue;
      selectedUserAgents.push(userAgent);
    }

    return selectedUserAgents;
  }

  public static popular(marketshareNeeded: number, filterFn?: (userAgent: UserAgent) => boolean) {
    const sortedUserAgents = this.all().sort((a, b) => b.marketshare - a.marketshare);
    const selectedUserAgents = [];
    let selectedMarketshare = 0;

    for (const userAgent of sortedUserAgents) {
      if (selectedMarketshare > marketshareNeeded) break;
      if (filterFn && !filterFn(userAgent)) continue;
      selectedMarketshare += userAgent.marketshare;
      selectedUserAgents.push(userAgent);
    }

    return selectedUserAgents;
  }

  public static getBrowser(browserId: string) {
    return Browsers.byId(browserId);
  }

  public static getOperatingSystem(operatingSystemid: string) {
    return OperatingSystems.byId(operatingSystemid);
  }

  public static extractMetaFromUserAgentId(userAgentId: string) {
    const matches = userAgentId.match(/^(([a-z-]+)(-([0-9-]+))?)--(([a-z-]+)-([0-9-]+))$/);
    const operatingSystemId = matches[1];
    const operatingSystemName = matches[2];
    const operatingSystemVersion = matches[4] || '';
    const browserId = matches[5];
    const browserName = matches[6];
    const browserVersion = matches[7];
    return {
      operatingSystemId,
      operatingSystemName,
      operatingSystemVersion,
      browserId,
      browserName,
      browserVersion,
    };
  }
}

interface IUserAgentsById {
  [id: string]: UserAgent;
}
