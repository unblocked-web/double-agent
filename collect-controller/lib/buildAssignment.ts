import { IUserAgentToTestPickType } from '@double-agent/config/interfaces/IUserAgentToTest';
import IAssignment, { IAssignmentType, AssignmentType } from '../interfaces/IAssignment';

export default function buildAssignment(
  id: string,
  num: number,
  userAgentId: string,
  type: IAssignmentType = AssignmentType.Individual,
  userAgentString: string = null,
  pickType: IUserAgentToTestPickType = null,
  usagePercent: number = null,
) {
  return {
    id,
    num,
    type,
    userAgentId,
    userAgentString,
    pickType,
    usagePercent,
  } as IAssignment;
}
