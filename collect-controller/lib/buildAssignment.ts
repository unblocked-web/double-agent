import { IUserAgentToTestPickType } from '@double-agent/config/interfaces/IUserAgentToTest';
import RealUserAgents from '@unblocked-web/real-user-agents';
import IAssignment, { AssignmentType, IAssignmentType } from '../interfaces/IAssignment';

export default function buildAssignment(
  id: string,
  num: number,
  userAgentId: string,
  type: IAssignmentType = AssignmentType.Individual,
  userAgentString: string = null,
  pickType: IUserAgentToTestPickType = null,
  usagePercent: number = null,
) {
  const userAgentMeta = RealUserAgents.extractMetaFromUserAgentId(userAgentId);
  userAgentMeta.browserVersion.replace('-', '.');
  userAgentMeta.operatingSystemVersion.replace('-', '.');

  return {
    id,
    num,
    type,
    userAgentId,
    browserMeta: userAgentMeta,
    userAgentString,
    pickType,
    usagePercent,
  } as IAssignment;
}
