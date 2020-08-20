import { IUserAgentToTestPickType} from "@double-agent/config/interfaces/IUserAgentToTest";
import IAssignment, { IAssignmentType, AssignmentType } from "../interfaces/IAssignment";

export default function buildAssignment(
    id: string,
    type: IAssignmentType = AssignmentType.Individual,
    useragent: string = null,
    pickType: IUserAgentToTestPickType = null,
    usagePercent: number = null,
) {
  return {
    id,
    type,
    useragent,
    pickType,
    usagePercent,
  } as IAssignment;
}
