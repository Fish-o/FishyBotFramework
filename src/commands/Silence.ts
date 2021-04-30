import { ApplicationCommandOptionType, FishyCommandCode, FishyCommandConfig } from "../types";
const SilenceCache = new Map<string, boolean>();
export const run: FishyCommandCode = async (client, interaction) => {
  const old = SilenceCache.get(interaction.raw_member?.user?.id || "");
  let new_val = true;
  if (old) {
    new_val = !old;
  }
  let found = interaction.data.options.find((opt) => opt.name == "silenced")?.value;
  if (typeof found === "boolean") {
    new_val = found;
  }
  SilenceCache.set(interaction.raw_member?.user?.id || "", new_val);
  if (!new_val) return interaction.sendSilent(`Turned silence mode **off**!`);
  else if (new_val) return interaction.sendSilent(`Turned silence mode **on**!`);
};

export const isSilent = (memberId: string): boolean => {
  return SilenceCache.get(memberId) || false;
};

export const config: FishyCommandConfig = {
  name: "silence",
  bot_needed: false,
  interaction_options: {
    name: "silence",
    description: "Make the bot only respond with ephemeral messages",
    options: [
      {
        name: "silenced",
        description: "If the it is set to silence or not",
        type: ApplicationCommandOptionType.BOOLEAN,
      },
    ],
  },
};
