import { FishyClient } from "../../..";
import { Interaction } from "../../../structures/Interaction";
import { ApplicationCommandOptionType, FishyCommandCode, FishyCommandConfig, FishyCommandHelp } from "../../../types";

export const run: FishyCommandCode = async (client, interaction) => {
  console.log(interaction.raw_interaction)
  interaction.send("asddfdafadf")

};

export const config: FishyCommandConfig = {
  name: "ping",
  bot_needed: false,
  interaction_options: {
    name: "ping",
    description: "Ping the bot",
    options:[
      {
        name:"user",
        description: 'asdf',
        type: ApplicationCommandOptionType.USER
      },
      {
        name:"channel",
        description: 'asdf',
        type: ApplicationCommandOptionType.CHANNEL
      },
      {
        name:"string",
        description: 'asdf',
        type: ApplicationCommandOptionType.STRING
      },
      {
        name:"INTEGER",
        description: 'asdf',
        type: ApplicationCommandOptionType.INTEGER
      },
      {
        name:"role",
        description: 'asdf',
        type: ApplicationCommandOptionType.ROLE
      },
      {
        name:"bool",
        description: 'asdf',
        type: ApplicationCommandOptionType.BOOLEAN
      }
    ]
  },
};
export const help: FishyCommandHelp = {
  description: "bbblah",
  usage: "blah",
};