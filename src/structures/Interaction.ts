import { MessageEmbed } from "discord.js";
import { FishyClient } from "..";
import {
  ApplicationCommandInteractionData,
  ApplicationCommandInteractionDataOption,
  ApplicationCommandOptionType,
  guild_member_object,
  InteractionApplicationCommandCallbackData,
  InteractionResponseType,
  raw_recieved_interaction,
  webhookOptions,
} from "../types";
import axios from "axios";
import * as DbUtils from "../utils/DbUtils";

export class Interaction {
  client: FishyClient;
  raw_interaction: any;
  data: ApplicationCommandInteractionData;
  type: number;

  name: string;
  args: Array<ApplicationCommandInteractionDataOption>;
  id: string;
  token: string;

  guild_id?: string;
  channel_id?: string;
  raw_member?: guild_member_object;

  response_used: boolean;

  constructor(client: FishyClient, raw_interaction: raw_recieved_interaction) {
    this.client = client;

    this.raw_interaction = raw_interaction;

    this.data = raw_interaction.data!;
    this.type = raw_interaction.type;

    this.id = raw_interaction.id;
    this.token = raw_interaction.token;

    this.guild_id = raw_interaction.guild_id;
    this.channel_id = raw_interaction.channel_id;

    this.raw_member = raw_interaction.member;

    this.name = this.data.name;
    this.args = this.data.options!;

    this.response_used = false;
  }

  // default interaction response
  async send(message?: string | MessageEmbed, options?: InteractionApplicationCommandCallbackData) {
    let embed: MessageEmbed | undefined;
    if (typeof message == "object") {
      embed = message;
      message = undefined;
    }
    let DATA: InteractionApplicationCommandCallbackData = { content: message, embeds: embed ? [embed] : undefined };
    if (options) {
      DATA = Object.assign(DATA, options);
    }
    this.response_used = true;
    return await axios.post(`https://discord.com/api/v8/interactions/${this.id}/${this.token}/callback`, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: DATA,
    });
  }

  // Send an ephemeral message (only the command caller can see the message)
  async sendSilent(message: string, options?: InteractionApplicationCommandCallbackData) {
    let DATA: InteractionApplicationCommandCallbackData = { flags: 64, content: message };
    if (options) {
      DATA = Object.assign(DATA, options);
    }

    this.response_used = true;
    return await axios.post(`https://discord.com/api/v8/interactions/${this.id}/${this.token}/callback`, {
      type: InteractionResponseType.ChannelMessageWithSource,
      data: DATA,
    });
  }

  // Edit the original message, or a different message sent with the interaction token
  async edit(
    message: string | MessageEmbed,
    options?: InteractionApplicationCommandCallbackData | string,
    message_id?: string
  ) {
    if (!options) {
      options = {};
    }
    if (!message_id && options && typeof options == "string") {
      message_id = options;
      options = undefined;
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
    if (!message_id) {
      message_id = "@original";
    }

    return await axios.post(
      `https://discord.com/api/v8/webhooks/${this.client.user!.id}/${this.token}/messages/${message_id}`,
      options
    );
  }

  // Delete the original message, or a different message sent with the interaction token
  async delete(message_id?: string) {
    if (!message_id) {
      message_id = "@original";
    }

    return await axios.delete(
      `https://discord.com/api/v8/webhooks/${this.client.user!.id}/${this.token}/messages/${message_id}`
    );
  }

  // Send a message via the interaction webhook, can only be used after interaction.send()
  async send_webhook(message?: string | MessageEmbed, options?: webhookOptions) {
    let embed: MessageEmbed | undefined;
    if (typeof message == "object") {
      embed = message;
      message = undefined;
    }
    let DATA: webhookOptions = { content: message, embeds: embed ? [embed] : undefined };
    if (options) {
      DATA = Object.assign(DATA, options);
    }

    return await axios.post(`https://discord.com/api/v8/webhooks/${this.client.user!.id}/${this.token}`, DATA);
  }

  // Get the discord.js channel
  get channel() {
    if (!this.channel_id) return undefined;
    return this.client.channels.cache.get(this.channel_id);
  }
  // Get the discord.js guild
  get guild() {
    if (!this.guild_id) return undefined;
    return this.client.guilds.cache.get(this.guild_id);
  }
  // Get the discord.js member
  get member() {
    if (!this.raw_member?.user?.id) return undefined;
    return this.guild?.members.cache.get(this.raw_member.user.id);
  }

  // DATABASE STUFF
  async getDbGuild(options?: DbUtils.db_fetch_options) {
    if (!this.guild_id) throw Error("No guild id on interaction found");
    return DbUtils.fetch(this.client, this.guild_id, options);
  }
  async updateDbGuild(model: any) {
    if (!this.guild_id) throw Error("No guild id on interaction found");
    return DbUtils.update(this.client, this.guild_id, model);
  }
}

/* Interaction example:
{
  version: 1,
  type: 2,
  token: 'asdf'
  member: {
    user: {
      username: 'Fish',
      public_flags: 256,
      id: '325893549071663104',
      discriminator: '2455',
      avatar: '5a4e62341afa47f200bd8f0dcf759512'
    },
    roles: [
      '790969042851856425',
      '790969058710519808',
      '790969073210097715'
    ],
    premium_since: null,
    permissions: '2147483647',
    pending: false,
    nick: 'sdfgsdfg',
    mute: false,
    joined_at: '2020-09-06T13:18:35.776000+00:00',
    is_pending: false,
    deaf: false
  },
  id: '792502570592894986',
  guild_id: '752155794153406476',
  data: { name: 'help', id: '791272914905333760' },
  channel_id: '784438571620106311'
}
*/
