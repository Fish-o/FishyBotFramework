import axios from "axios";
import { Message, MessageEmbed } from "discord.js";
import { FishyClient } from "..";
import {
  InteractionApplicationCommandCallbackData,
  InteractionResponseType,
  raw_received_button_interaction,
} from "../types";
import { Interaction } from "./Interaction";

class ButtonInteraction extends Interaction {
  public customID: string;
  public componentType: 2;
  private _raw_button_interaction: raw_received_button_interaction;
  private _message?: Message;

  constructor(client: FishyClient, raw_button_interaction: raw_received_button_interaction) {
    let data: any = JSON.parse(JSON.stringify(raw_button_interaction));
    data.type = 2;
    data.data = {};
    super(client, data);
    this.customID = raw_button_interaction.data.custom_id;
    this.componentType = raw_button_interaction.data.component_type;
    this._raw_button_interaction = raw_button_interaction;

    // TODO: make sending buttons/components work with .send
  }
  get message() {
    const channel = this.channel;
    if (!channel?.isText()) throw new Error("Channel is not a text channel");
    return this._message || new Message(this.client, this._raw_button_interaction.message, channel);
  }

  async editSource(message: string | MessageEmbed, options?: InteractionApplicationCommandCallbackData | string) {
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

    return await axios.patch(`https://discord.com/api/v9/interactions/${this.id}/${this.token}/callback`, {
      type: InteractionResponseType.UpdateMessage,
      data: options,
    });
  }
  async buttonAck() {
    return await axios.post(`https://discord.com/api/v9/interactions/${this.id}/${this.token}/callback`, {
      type: InteractionResponseType.DeferredUpdateMessage,
    });
  }
}
export { ButtonInteraction as default };
