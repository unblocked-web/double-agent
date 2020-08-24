import { execSync, spawn } from 'child_process';

export function buildChromeDocker(version: string, browserUrl: string) {
  const dockerName = `chrome-${version}`;
  const command = `docker build --build-arg chrome_url=${browserUrl} -f "Dockerfile-Chrome" -t "${dockerName}" .`;
  console.log(command);
  execSync(command, {
    stdio: 'inherit',
  });
  return dockerName;
}

export function getDockerHost() {
  const dockerHost = execSync(
    `docker run --rm node:12-slim getent hosts host.docker.internal | awk '{ print $1 }'`,
  )
    .toString()
    .trim();
  console.log(`Local docker internal ip is ${dockerHost}`);
  return dockerHost;
}

export async function runDocker(dockerName: string, dockerHost: string) {
  const command = `docker run --init --rm --name dumper --shm-size='3gb' -p=9224:9222 --cap-add=SYS_ADMIN --add-host="a1.ulixee-test.org:${dockerHost}" ${dockerName}`;
  console.log(command);
  const child = spawn(command, {
    shell: true,
    stdio: 'pipe',
  });
  process.on('exit', onExit);
  process.on('SIGTERM', onExit);
  child.stderr.setEncoding('utf8');
  child.stdout.setEncoding('utf8');
  child.stderr.pipe(process.stderr);
  child.stdout.pipe(process.stdout);

  await new Promise(resolve => {
    child.stderr.on('data', msg => {
      if (msg.includes('listening')) resolve();
    });
    child.stdout.on('data', msg => {
      if (msg.includes('listening')) resolve();
    });
  });

  return child;
}

function onExit() {
  execSync('docker stop dumper || true');
}
