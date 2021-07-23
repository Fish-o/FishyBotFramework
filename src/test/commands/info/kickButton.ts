import ButtonInteraction from "../../../structures/ButtonInteraction";
import { FishyComponentCommandCode, FishyComponentCommandConfig } from "../../../types";

export const run: FishyComponentCommandCode = async (client, interaction) => {
  if (interaction instanceof ButtonInteraction) {
    const memberID = interaction.data.custom_id.slice(config.custom_id.length);
    const member = await interaction.guild?.members.fetch(memberID);
    await member?.kick();
    interaction.send("Kicked the member!");
  }
};

export const config: FishyComponentCommandConfig = {
  custom_id: "kick_",
  atStart: true,
  bot_needed: true,
  user_perms: ["KICK_MEMBERS"],
};
