import { FishyClient } from "./client";
export { FishyClient };

if (require.main === module) {
  (async () => {
    require("dotenv").config();
    let client = new FishyClient({ token: process.env.discord_token!, cmd_dir: "./lib/test/commands" });
    await client.load();
    await client.login();
    console.log(client.categories.keys())
    console.log(client.commands.values());
    
  })();
}
