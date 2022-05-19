import ProbesGenerator from '@double-agent/config/lib/ProbesGenerator';

export async function extractFoundationalProbes(profilesDir: string): Promise<void> {
  const probesGenerator = new ProbesGenerator(profilesDir);
  await probesGenerator.run();
  await probesGenerator.save();
}
