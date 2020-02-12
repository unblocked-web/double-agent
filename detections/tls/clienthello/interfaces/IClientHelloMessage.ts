import { IClientHello } from '../lib/parseHelloMessage';
import IJa3Details from './IJa3Details';
import IJa3 from './IJa3';

export default interface IClientHelloMessage {
  clienthello: IClientHello;
  ja3Details: IJa3Details;
  ja3Extended: IJa3;
}
