import { FishyButtonCommandCode, FishyButtonCommandConfig } from "../../../types";

let number = 4;
export const run: FishyButtonCommandCode = async (client, interaction) => {
  // 5 sends "fishierbot is thinking"
  // 7 edits original message
  interaction.buttonAck();
};

export const config: FishyButtonCommandConfig = {
  custom_id: "send_ping",
  atStart: true,
  bot_needed: false,
};
