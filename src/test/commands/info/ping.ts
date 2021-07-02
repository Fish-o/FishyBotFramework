import {
  ApplicationCommandOptionType,
  ComponentActionRow,
  ComponentStyle,
  ComponentType,
  FishyCommandCode,
  FishyCommandConfig,
} from "../../../types";

export const run: FishyCommandCode = async (client, interaction) => {
  console.log(interaction);
  console.log(interaction.user);
  console.log(interaction.member);

  const roles = await interaction.guild!.roles.fetch();

  const emoji = { name: "atsymbol", id: "860227330173698069" };
  const data = roles.cache.map((role) => ({ label: role.name, value: `${role.id}`, emoji }));
  interaction.send("oi", {
    components: [
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Select,
            custom_id: "send_ping",
            options: data,
            max_values: data.length,
            min_values: 4,
          },
        ],
      },
      {
        type: ComponentType.ActionRow,
        components: [
          {
            type: ComponentType.Button,
            style: ComponentStyle.Success,
            label: "HEY",
            custom_id: "send_ping",
          },
        ],
      },
    ],
  });
};

export const config: FishyCommandConfig = {
  name: "ping",
  bot_needed: true,
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
