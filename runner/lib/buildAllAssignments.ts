import UserAgentsToTest from '@double-agent/config/lib/UserAgentsToTest';
import IUserAgentToTest, {
  UserAgentToTestPickType,
  IUserAgentToTestPickType
} from '@double-agent/config/interfaces/IUserAgentToTest';
import { createUseragentId } from '@double-agent/config';
import buildAssignment from "./buildAssignment";
import IAssignment, {AssignmentType} from '../interfaces/IAssignment';

export default async function buildAllAssignments() {
  const assignments: IAssignment[] = [];
  const userAgentsToTest = UserAgentsToTest.all();

  for (const userAgentToTest of userAgentsToTest) {
    const useragent = userAgentToTest.string;
    const id = createUseragentId(useragent);
    const type = AssignmentType.Individual;
    assignments.push(buildAssignment(
      id,
      type,
      useragent,
    ));
  }

  assignments.push(...buildAssignmentsOverTime(userAgentsToTest, UserAgentToTestPickType.popular));
  assignments.push(...buildAssignmentsOverTime(userAgentsToTest, UserAgentToTestPickType.random));

  return assignments;
}

// HELPERS //////////////////

function buildAssignmentsOverTime(userAgentsToTest: IUserAgentToTest[], pickType: IUserAgentToTestPickType) {
  const type = AssignmentType.OverTime;
  const assignments: IAssignment[] = [];
  const selUserAgents = userAgentsToTest.filter(x => x.pickTypes.includes(pickType));
  const sortedUserAgents = selUserAgents.sort((a: IUserAgentToTest, b: IUserAgentToTest) => a.usagePercent[pickType] - b.usagePercent[pickType]);
  const countByUseragentId: { [useragentId: string]: number } = {};

  while (assignments.length < 100) {
    let userAgentToTest: IUserAgentToTest;
    let useragent: string;
    let useragentId: string;
    for (userAgentToTest of sortedUserAgents) {
      useragent = userAgentToTest.string;
      useragentId = createUseragentId(useragent);
      countByUseragentId[useragentId] = countByUseragentId[useragentId] || 0;
      const pctIncluded = countByUseragentId[useragentId] / assignments.length * 100;
      if (pctIncluded < userAgentToTest.usagePercent[pickType]) break;
    }
    countByUseragentId[useragentId] += 1;
    assignments.push(buildAssignment(
        createOverTimeSessionKey(pickType, assignments.length, useragentId),
        type,
        useragent,
        pickType,
        userAgentToTest.usagePercent[pickType],
    ));
  }

  return assignments;
}

export function createOverTimeSessionKey(pickType: IUserAgentToTestPickType, indexPos: number, useragentId: string) {
  return `${pickType}-${indexPos.toString().padStart(2, '0')}:${useragentId}`;
}

export function extractMetaFromOverTimeSessionKey(sessionKey: string) {
  // this function is used in ScraperReport
  const [pickType, indexPos, useragentId] = sessionKey.match(/^([a-z]+)-([0-9]+):(.+)$/).slice(1);
  return {
    pickType: pickType as IUserAgentToTestPickType,
    indexPos: Number(indexPos),
    useragentId
  };
}
