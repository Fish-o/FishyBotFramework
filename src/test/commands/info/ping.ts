import { FishyClient } from "../../..";
import { Interaction } from "../../../structures/Interaction";
import { FishyCommandCode, FishyCommandConfig, FishyCommandHelp } from "../../../types";

export const run: FishyCommandCode = async (client, interaction) => {
  console.log(interaction.getDbGuild())
  interaction.send("asddfdafadf")

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