import SelectInteraction from "../../../structures/SelectInteraction";
import { FishyComponentCommandCode, FishyComponentCommandConfig } from "../../../types";

export const run: FishyComponentCommandCode = async (client, interaction) => {
  if (interaction instanceof SelectInteraction) {
    interaction.sendSilent(`You have selected: \`${interaction.data.values.join(", ")}\``);
  }
};

export const config: FishyComponentCommandConfig = {
  custom_id: "send_ping",
  atStart: true,
  bot_needed: false,
};
