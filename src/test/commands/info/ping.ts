import {
  ApplicationCommandOptionType,
  ComponentActionRow,
  ComponentStyle,
  ComponentType,
  FishyCommandCode,
  FishyCommandConfig,
} from "../../../types";

export const run: FishyCommandCode = async (client, interaction) => {
  const components: ComponentActionRow[] = [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          label: "Get Ping",
          style: ComponentStyle.Danger,
          custom_id:
            "send_ping|012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789",
        },
      ],
    },
  ];

  interaction.send("message", { components: components });
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
        name: "integer",
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
