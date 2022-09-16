import * as Fs from 'fs';
import * as Path from 'path';

export default function buildReadme():void {
  const readmeTemplatePath = Path.join(__dirname, '../readme-template.md');
  let main = Fs.readFileSync(readmeTemplatePath, 'utf8');

  const regexMatch = /({{inject=(.+\.md)}})/;
  while (regexMatch.test(main)) {
    const matches = regexMatch.exec(main);
    if (matches.length > 1) {
      const fileName = matches[2];
      const filePath = Path.join(__dirname, '../', fileName);
      const contents = Fs.readFileSync(filePath, 'utf8');
      main = main.replace(matches[0], contents);
    }
  }

  const readmePath = Path.resolve(__dirname, '../../README.md');
  Fs.writeFileSync(readmePath, main);
}
