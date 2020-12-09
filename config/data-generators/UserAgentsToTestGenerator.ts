import * as Fs from 'fs';
import RealUserAgents from '@double-agent/real-user-agents';
import UserAgent from '@double-agent/real-user-agents/lib/UserAgent';
import { FILE_PATH } from '../lib/UserAgentsToTest';
import IUserAgentToTest, { UserAgentToTestPickType } from '../interfaces/IUserAgentToTest';

export default class UserAgentsToTestGenerator {
  private instances: IUserAgentToTest[];

  constructor(private profilesDir: string) {}

  public async run() {
    const instancesById: { [id: string]: IUserAgentToTest } = {};

    const popularUserAgents = RealUserAgents.popular(50, this.hasProfile.bind(this)).slice(0, 1);
    const totalPopularPct = popularUserAgents.reduce((total, x) => total + x.marketshare, 0);
    popularUserAgents.forEach(userAgent => {
      const pickType = UserAgentToTestPickType.popular;
      const instance = instancesById[userAgent.id] || createUserAgentToTest(userAgent);
      instance.pickTypes.push(pickType);
      instance.usagePercent[pickType] = (userAgent.marketshare / totalPopularPct) * 100;
      instancesById[userAgent.id] = instance;
    });

    const randomUserAgents = RealUserAgents.random(50, this.hasProfile.bind(this));
    randomUserAgents.forEach(userAgent => {
      const pickType = UserAgentToTestPickType.random;
      const instance = instancesById[userAgent.id] || createUserAgentToTest(userAgent);
      instance.pickTypes.push(pickType);
      instance.usagePercent[pickType] = 2;
      instancesById[userAgent.id] = instance;
    });

    this.instances = Object.values(instancesById);
  }

  public save() {
    const data = JSON.stringify(this.instances, null, 2);
    console.log(data);
    Fs.writeFileSync(FILE_PATH, data);
  }

  private hasProfile(userAgent: UserAgent) {
    return Fs.existsSync(`${this.profilesDir}/${userAgent.id}`);
  }
}

function createUserAgentToTest(userAgent: UserAgent) {
  return {
    browserId: userAgent.browserId,
    operatingSystemId: userAgent.operatingSystemId,
    pickTypes: [],
    usagePercent: {
      [UserAgentToTestPickType.popular]: 0,
      [UserAgentToTestPickType.random]: 0,
    },
    string: userAgent.strings[0],
  };
}
