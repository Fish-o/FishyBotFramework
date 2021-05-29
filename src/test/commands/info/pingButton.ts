import { FishyButtonCommandCode, FishyButtonCommandConfig } from "../../../types";

export const run: FishyButtonCommandCode = async (client, interaction) => {
  interaction.send("_pong_");
};

export const config: FishyButtonCommandConfig = {
  custom_id: "send_ping",
  atStart: true,
  bot_needed: false,
};
