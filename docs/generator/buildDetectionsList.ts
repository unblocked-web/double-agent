import getAllDetectors from '@double-agent/runner/lib/getAllDetectors';
import fs from 'fs';

const header = `Module | Detections | Description | Implemented
--- | --- | --- | :---:`;

const outputFile = __dirname + '/../output/detections.md';
export default function buildDetectionsList() {
  const allDetectors = getAllDetectors();
  let md = header;
  for (const detector of allDetectors) {
    md += `\n${detector.category}/${detector.testName} | ${detector.testCategories
      .map(x => '* ' + x)
      .join('<br/><br/>')} | ${detector.summary} | ${!!detector.module ? ':white_check_mark:' : ' '}`;
  }
  fs.writeFileSync(outputFile, md);
}
