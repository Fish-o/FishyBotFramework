import { FishyComponentCommandCode, FishyComponentCommandConfig } from "../../../types";

export const run: FishyComponentCommandCode = async (client, interaction) => {
  console.log(interaction);
  //interaction.send("_pong_");
  interaction.deferUpdateMessage();
  //interaction.updateMessage(" PP");
  interaction.edit("_pong_");
};

export const config: FishyComponentCommandConfig = {
  custom_id: "send_ping",
  atStart: true,
  bot_needed: false,
};
