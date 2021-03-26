import { FishyClient } from "./client";
import { ApplicationCommand, ApplicationCommandOptionType } from "./types";
export { FishyClient };
import { ApplicationCommandCompare } from "./utils/ApplicationCommandCompare";

// Usefull for quick testing, only gets run when started with `node index.js`
if (require.main === module) {
  (async () => {
    require("dotenv").config();
    let { GuildModel } = require("./test/models/Guild")
    let client = new FishyClient({
      token: process.env.discord_token!,
      db_uri: process.env.mongodb_uri!,
      guild_model: GuildModel,
      author: "Fish#2455",
      cmd_dir: "./lib/test/commands",
      disable_load_on_construct: true,
    });
    await client.load();
    await client.login();
    console.log(client.categories)
  })();
}
