import { Message } from "discord.js";
import { FishyClient } from "..";
import { raw_received_button_interaction } from "../types";
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
}
export { ButtonInteraction as default };
