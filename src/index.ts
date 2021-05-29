import { FishyClient } from "./client";
import * as types from "./types";
export { FishyClient, types };

// Useful for quick testing, only gets run when started with `node index.js`
if (require.main === module) {
  (async () => {
    require("dotenv").config();
    let { GuildModel } = require("./test/models/Guild");
    let client = new FishyClient({
      token: process.env.discord_token!,
      db_uri: process.env.mongodb_uri!,
      guild_model: GuildModel,
      author: "Fish#2455",
      cmd_dir: "lib/test/commands",
      disable_load_on_construct: true,
      dev_guild_id: "729791412459143278",
      info_channel_id: "838138764211126294",
    });
    await client.load();
    await client.login();
    console.log(client.categories);
  })();
}
