import { APIMessage, Client, DMChannel, Message, NewsChannel, Structures, TextChannel } from "discord.js";
import { FishyClient } from "..";
import { ComponentActionRow, ComponentButton } from "../types";

class ComponentMessage extends Message {
  components?: ComponentActionRow[] | ComponentButton[];
  /**
   * @param {Client} client The instantiating client
   * @param {Object} data The data for the message
   * @param {TextChannel|DMChannel|NewsChannel} channel The channel the message was sent in
   */
  constructor(client: Client | FishyClient, data: any, channel: TextChannel | DMChannel | NewsChannel) {
    super(client, data, channel);
    if (data.components?.[0]) {
      this.components = data.components;
    }
  }
}
export { ComponentMessage as default };
