export default interface IDomProfile {
  useragent: string;
  dom: {
    window: any;
    detached: any;
  };
}
