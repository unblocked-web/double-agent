import UserAgentsToTest from '@double-agent/config/lib/UserAgentsToTest';
import IUserAgentToTest, {
  UserAgentToTestPickType,
  IUserAgentToTestPickType,
} from '@double-agent/config/interfaces/IUserAgentToTest';
import { createUserAgentIdFromString } from '@double-agent/config';
import buildAssignment from './buildAssignment';
import IAssignment, { AssignmentType } from '../interfaces/IAssignment';

export default async function buildAllAssignments() {
  const assignments: IAssignment[] = [];
  const userAgentsToTest = UserAgentsToTest.all();

  for (const userAgentToTest of userAgentsToTest) {
    const userAgentString = userAgentToTest.string;
    const id = createUserAgentIdFromString(userAgentString);
    const type = AssignmentType.Individual;
    assignments.push(buildAssignment(id, type, userAgentString));
  }

  assignments.push(...buildAssignmentsOverTime(userAgentsToTest, UserAgentToTestPickType.popular));
  assignments.push(...buildAssignmentsOverTime(userAgentsToTest, UserAgentToTestPickType.random));

  return assignments;
}

// HELPERS //////////////////

function buildAssignmentsOverTime(
  userAgentsToTest: IUserAgentToTest[],
  pickType: IUserAgentToTestPickType,
) {
  const type = AssignmentType.OverTime;
  const assignments: IAssignment[] = [];
  const selUserAgents = userAgentsToTest.filter(x => x.pickTypes.includes(pickType));
  const sortedUserAgents = selUserAgents.sort(
    (a: IUserAgentToTest, b: IUserAgentToTest) =>
      a.usagePercent[pickType] - b.usagePercent[pickType],
  );
  const countByUserAgentId: { [userAgentId: string]: number } = {};

  while (assignments.length < 100) {
    let userAgentToTest: IUserAgentToTest;
    let userAgentString: string;
    let userAgentId: string;
    for (userAgentToTest of sortedUserAgents) {
      userAgentString = userAgentToTest.string;
      userAgentId = createUserAgentIdFromString(userAgentString);
      countByUserAgentId[userAgentId] = countByUserAgentId[userAgentId] || 0;
      const pctIncluded = (countByUserAgentId[userAgentId] / assignments.length) * 100;
      if (pctIncluded < userAgentToTest.usagePercent[pickType]) break;
    }
    countByUserAgentId[userAgentId] += 1;
    assignments.push(
      buildAssignment(
        createOverTimeSessionKey(pickType, assignments.length, userAgentId),
        type,
        userAgentString,
        pickType,
        userAgentToTest.usagePercent[pickType],
      ),
    );
  }

  return assignments;
}

export function createOverTimeSessionKey(
  pickType: IUserAgentToTestPickType,
  indexPos: number,
  userAgentId: string,
) {
  return `${pickType}-${indexPos.toString().padStart(2, '0')}:${userAgentId}`;
}

export function extractMetaFromOverTimeSessionKey(sessionKey: string) {
  // this function is used in ScraperReport
  const [pickType, indexPos, userAgentId] = sessionKey.match(/^([a-z]+)-([0-9]+):(.+)$/).slice(1);
  return {
    pickType: pickType as IUserAgentToTestPickType,
    indexPos: Number(indexPos),
    userAgentId,
  };
}
