export default interface IPlugin {
  id: string;
  dir: string;
  summary: string;
  initialize(): void;
}
