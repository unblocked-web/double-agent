import '@ulixee/commons/lib/SourceMapSupport';
import analyzeAssignmentResults from '@double-agent/runner/lib/analyzeAssignmentResults';
import { getExternalDataPath } from '../paths';

const assignmentsDataDir = getExternalDataPath(`/3-assignments`);
const resultsDir = getExternalDataPath(`/4-assignment-results`);

analyzeAssignmentResults(assignmentsDataDir, resultsDir).catch(console.log);
