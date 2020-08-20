import * as Fs from 'fs';
import RealUserAgents from "@double-agent/real-user-agents";
import UserAgent from "@double-agent/real-user-agents/lib/UserAgent";
import { FILE_PATH } from './UserAgentsToTest';
import IUserAgentToTest, { UserAgentToTestPickType } from '../interfaces/IUserAgentToTest';

export default class UserAgentsToTestGenerator {
  private instances: IUserAgentToTest[];

  public async run() {
    const instancesById: { [id: string]: IUserAgentToTest } = {};

    const popularUserAgents = RealUserAgents.popular(50);
    const totalPopularPct = popularUserAgents.reduce((total, x) => total + x.marketshare, 0);
    popularUserAgents.forEach(userAgent => {
      const instance = instancesById[userAgent.id] || createUserAgentToTest(userAgent);
      instance.pickTypes.push(UserAgentToTestPickType.popular);
      instance.usagePercent[UserAgentToTestPickType.popular] = userAgent.marketshare / totalPopularPct  * 100;
      instancesById[userAgent.id] = instance;
    });

    const randomUserAgents = RealUserAgents.random(50);
    randomUserAgents.forEach(userAgent => {
      const instance = instancesById[userAgent.id] || createUserAgentToTest(userAgent);
      instance.pickTypes.push(UserAgentToTestPickType.random);
      instance.usagePercent[UserAgentToTestPickType.random] = 2;
      instancesById[userAgent.id] = instance;
    });

    this.instances = Object.values(instancesById);
  }

  public save() {
    const data = JSON.stringify(this.instances, null, 2);
    Fs.writeFileSync(FILE_PATH, data);
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
  }
}
