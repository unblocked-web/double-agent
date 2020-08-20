import OsGenerator from "../lib/OsGenerator";
import BrowserGenerator from "../lib/BrowserGenerator";
import UserAgentGenerator from "../lib/UserAgentGenerator";

export default function build() {
  new OsGenerator().run().save();
  new BrowserGenerator().run().save();
  new UserAgentGenerator().run().save();
}
