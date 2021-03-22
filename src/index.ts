import { FishyClient } from "./client";
import { ApplicationCommand, ApplicationCommandOptionType } from "./types";
export { FishyClient };
import { ApplicationCommandCompare } from "./utils/ApplicationCommandCompare";

// Usefull for quick testing, only gets run when started with `node index.js`
if (require.main === module) {
  (async () => {
    require("dotenv").config();
    let client = new FishyClient({
      token: process.env.discord_token!,
      author: "Fish#2455",
      cmd_dir: "./lib/test/commands",
    });
    await client.load();
    await client.login();
  })();
}
