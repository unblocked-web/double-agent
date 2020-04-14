import ClientHelloProfile from './ClientHelloProfile';
import buildJa3Extended from './buildJa3Extended';
import buildJa3 from './buildJa3';

export default async function exportTlsProfiles() {
  const profiles = ClientHelloProfile.allProfiles;

  for (const profile of profiles) {
    const ja3 = buildJa3(profile.clientHello);
    const readHello = buildJa3Extended(ja3, profile.clientHello);
    console.log(readHello);
  }
}
