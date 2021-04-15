import * as Tar from 'tar';
import Fs from 'fs';

export async function createTarGz(gzFilePath: string, filesDirPath: string, files: string[]): Promise<void> {
  console.log('Creating %s', gzFilePath, {
    filesDirPath,
    files,
  });
  await new Promise<void>((resolve, reject) => {
    Tar.create(
        {
          gzip: true,
          cwd: filesDirPath,
        },
        files,
    )
        .pipe(Fs.createWriteStream(gzFilePath, { autoClose: true }))
        .on('error', reject)
        .on('finish', resolve);
  });

  console.log('CREATED TAR');
}
