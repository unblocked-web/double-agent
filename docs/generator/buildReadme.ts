import * as fs from 'fs';

export default function buildReadme() {
  let main = fs.readFileSync(__dirname + '/../readme-template.md', 'utf8');

  let regexMatch = /({{inject=(.+\.md)}})/;
  while (regexMatch.test(main)) {
    const matches = regexMatch.exec(main);
    if (matches.length > 1) {
      const file = matches[2];
      const contents = fs.readFileSync(__dirname + '/../' + file, 'utf8');
      main = main.replace(matches[0], contents);
    }
  }
  fs.writeFileSync(__dirname + '/../../README.md', main);
}
