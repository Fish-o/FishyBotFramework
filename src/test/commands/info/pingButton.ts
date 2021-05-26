import { FishyButtonCommandCode, FishyButtonCommandConfig } from "../../../types";

export const run: FishyButtonCommandCode = async (client, interaction) => {
  interaction.sendSilent(`Ping: ${client.ws.ping}\n${interaction.customID.split("|").slice(1).join("|")}`);
};

export const config: FishyButtonCommandConfig = {
  custom_id: "send_ping",
  atStart: true,
  bot_needed: false,
};
