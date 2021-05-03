import { ApplicationCommandOptionType, FishyCommandCode, FishyCommandConfig } from "../../../types";

export const run: FishyCommandCode = async (client, interaction) => {
  console.log(interaction);
  interaction.send("blah");
  interaction.send("YOOO");
};

export const config: FishyCommandConfig = {
  name: "ping",
  bot_needed: false,
  interaction_options: {
    name: "ping",
    description: "Ping the bot",
    user_perms: ["ADD_REACTIONS"],
    options: [
      {
        name: "user",
        description: "asdf",
        type: ApplicationCommandOptionType.USER,
        user_perms: ["ADMINISTRATOR"],
      },
      {
        name: "channel",
        description: "asdf",
        type: ApplicationCommandOptionType.CHANNEL,
      },
      {
        name: "string",
        description: "asdf",
        type: ApplicationCommandOptionType.STRING,
      },
      {
        name: "INTEGER",
        description: "asdf",
        type: ApplicationCommandOptionType.INTEGER,
      },
      {
        name: "role",
        description: "asdf",
        type: ApplicationCommandOptionType.ROLE,
      },
      {
        name: "bool",
        description: "asdf",
        type: ApplicationCommandOptionType.BOOLEAN,
      },
    ],
  },
};
