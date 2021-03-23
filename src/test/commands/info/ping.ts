import { FishyClient } from "../../..";
import { Interaction } from "../../../structures/Interaction";
import { FishyCommandCode, FishyCommandConfig, FishyCommandHelp } from "../../../types";

export const run: FishyCommandCode = async (client, interaction) => {
  console.log(interaction.raw_interaction)
  
  interaction.send("asddfdafadf")
  throw Error("BLAH");
  interaction.send(`Current websocket ping: \`${client.ws.ping}ms\``);
};

export const config: FishyCommandConfig = {
  name: "ping",
  bot_needed: false,
  interaction_options: {
    name: "ping",
    description: "Ping the bot"
  },
};
export const help: FishyCommandHelp = {
  description: "bbblah",
  usage: "blah",
};