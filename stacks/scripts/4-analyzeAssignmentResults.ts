import * as Path from 'path';

import { analyzeAssignmentResults } from '@double-agent/runner/lib/analyzeAssignmentResults';

const probesDataDir = Path.resolve(__dirname, `../data/external/1-foundational-probes`);
const assignmentsDataDir = Path.resolve(__dirname, `../data/external/3-assignments`);
const resultsDir = Path.resolve(__dirname, `../data/external/4-assignment-results`);

analyzeAssignmentResults(probesDataDir, assignmentsDataDir, resultsDir).catch(console.log);
