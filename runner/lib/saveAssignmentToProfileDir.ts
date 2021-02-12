import Path from 'path';
import Fs from 'fs';
import unzipper from 'unzipper';
import assignmentServer, { IAssignment } from './assignmentServer';

export default async function saveAssignmentToProfileDir(assignment: IAssignment, baseDir: string): Promise<string> {
  const userId = assignment.id;
  const filesStream = await assignmentServer<any>(`/download/${assignment.id}`, { userId });
  const filesDir = Path.join(baseDir, userId);
  if (!Fs.existsSync(filesDir)) Fs.mkdirSync(filesDir, { recursive: true });

  await new Promise(resolve => {
    filesStream.pipe(unzipper.Extract({ path: filesDir }));
    filesStream.on('finish', () => resolve());
  });
  await new Promise(resolve => setTimeout(resolve, 100));

  return filesDir;
}
