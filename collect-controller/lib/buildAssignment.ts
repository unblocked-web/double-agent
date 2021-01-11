import { IUserAgentToTestPickType } from '@double-agent/config/interfaces/IUserAgentToTest';
import IAssignment, { IAssignmentType, AssignmentType } from '../interfaces/IAssignment';

export default function buildAssignment(
  id: string,
  type: IAssignmentType = AssignmentType.Individual,
  userAgentString: string = null,
  pickType: IUserAgentToTestPickType = null,
  usagePercent: number = null,
  num = 0,
) {
  return {
    id,
    num,
    type,
    userAgentString,
    pickType,
    usagePercent,
  } as IAssignment;
}
