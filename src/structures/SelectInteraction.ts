import axios from "axios";
import { Message, MessageEmbed } from "discord.js";
import { FishyClient } from "..";
import {
  InteractionApplicationCommandCallbackData,
  InteractionResponseType,
  raw_received_button_interaction,
  raw_received_select_interaction,
} from "../types";
import ComponentMessage from "./ComponentMessage";
import { Interaction } from "./Interaction";

class SelectInteraction extends Interaction {
  public data: raw_received_select_interaction["data"];
  private _message?: ComponentMessage;
  private _raw_select_interaction: raw_received_select_interaction;
  constructor(client: FishyClient, raw_select_interaction: raw_received_select_interaction) {
    super(client, raw_select_interaction);
    this._raw_select_interaction = raw_select_interaction;
    this.data = raw_select_interaction.data;
  }

  get message(): ComponentMessage {
    const channel = this.channel;
    if (!channel?.isText()) throw new Error("Channel is not a text channel");
    return this._message || new ComponentMessage(this.client, this._raw_select_interaction.message, channel);
  }
  async updateMessage(message: string | MessageEmbed, options?: InteractionApplicationCommandCallbackData | string) {
    if (!options) {
      options = {};
    }

    if (typeof message !== "string" && typeof options !== "string") {
      if (!options) {
        options = { embeds: [message] };
      } else if (options.embeds) {
        options.embeds.push(message);
      } else {
        options.embeds = [message];
      }
      message = "";
    } else if (typeof message == "string" && typeof options !== "string") {
      options!.content = message;
    }
    this.response_used = true;
    return await axios.patch(`https://discord.com/api/v9/interactions/${this.id}/${this.token}/callback`, {
      type: InteractionResponseType.UpdateMessage,
      data: options,
    });
  }
  async deferUpdateMessage() {
    this.response_used = true;
    return await axios.post(`https://discord.com/api/v9/interactions/${this.id}/${this.token}/callback`, {
      type: InteractionResponseType.DeferredUpdateMessage,
    });
  }
}
export { SelectInteraction as default };
