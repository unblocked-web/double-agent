import IDetectionDomains from './IDetectionDomains';

export default interface IDomainset {
  secureDomains: IDetectionDomains;
  httpDomains: IDetectionDomains;
  listeningDomains: IDetectionDomains;
}
