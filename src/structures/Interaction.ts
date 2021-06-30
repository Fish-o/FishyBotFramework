import { GuildMember, Message, MessageEmbed, User } from "discord.js";
import { FishyClient } from "..";
import {
  ApplicationCommandInteractionData,
  ApplicationCommandInteractionDataOption,
  ApplicationCommandInteractionResolved,
  ApplicationCommandOptionType,
  guild_member_object,
  InteractionApplicationCommandCallbackData,
  InteractionResponseType,
  raw_received_interaction,
  user_object,
  webhookOptions,
} from "../types";
import axios, { AxiosResponse } from "axios";
import * as DbUtils from "../utils/DbUtils";
import { InteractionData } from "./InteractionOptions";
import * as Silence from "../commands/Silence";

export class Interaction {
  client: FishyClient;
  raw_interaction: raw_received_interaction;
  data: InteractionData;
  type: number;

  name: string;
  args: Array<ApplicationCommandInteractionDataOption>;
  mentions;
  id: string;
  token: string;

  guild_id?: string;
  channel_id?: string;
  raw_member?: guild_member_object;
  raw_user: user_object;

  response_used: boolean;

  constructor(client: FishyClient, raw_interaction: raw_received_interaction) {
    this.client = client;

    this.raw_interaction = raw_interaction;

    this.data = new InteractionData(client, raw_interaction.data!, this.guild);
    this.type = raw_interaction.type;

    this.id = raw_interaction.id;
    this.token = raw_interaction.token;

    this.guild_id = raw_interaction.guild_id;
    this.channel_id = raw_interaction.channel_id;

    this.raw_member = raw_interaction.member;
    this.raw_user = raw_interaction.user || raw_interaction.member!.user!;
    this.name = this.data.name;
    this.args = this.data.options!;
    this.mentions = this.data.mentions;

    this.response_used = false;
  }

  // default interaction response
  async send(
    message?: string | MessageEmbed,
    options?: InteractionApplicationCommandCallbackData
  ): Promise<AxiosResponse<any>> {
    if (Silence.isSilent(this.raw_member?.user?.id || "") && options?.flags !== 64) {
      return this.sendSilent(message, options);
    }

    if (this.response_used) {
      if (options?.flags !== 64) {
        return this.send_webhook(message, options);
      } else {
        return this.send_webhook(message, options);
      }
    }

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
    try {
      return await axios.post(`https://discord.com/api/v9/interactions/${this.id}/${this.token}/callback`, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: DATA,
      });
    } catch (err) {
      console.error(err);
      throw new Error(err);
    }
  }

  // Send an ephemeral message (only the command caller can see the message)
  async sendSilent(
    message?: string | MessageEmbed,
    options?: InteractionApplicationCommandCallbackData
  ): Promise<AxiosResponse<any>> {
    let DATA: InteractionApplicationCommandCallbackData = { flags: 64 };
    if (options) {
      DATA = Object.assign(DATA, options);
    }
    return this.send(message, DATA);
  }

  // Ack to edit later
  async defer() {
    this.response_used = true;
    return await axios.post(`https://discord.com/api/v9/interactions/${this.id}/${this.token}/callback`, {
      type: InteractionResponseType.DeferredChannelMessageWithSource,
      data: {},
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
    return await axios.patch(
      `https://discord.com/api/v9/webhooks/${this.client.user!.id}/${this.token}/messages/${message_id}`,
      options
    );
  }

  // Delete the original message, or a different message sent with the interaction token
  async delete(message_id?: string) {
    if (!message_id) {
      message_id = "@original";
    }

    return await axios.delete(
      `https://discord.com/api/v9/webhooks/${this.client.user!.id}/${this.token}/messages/${message_id}`
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

    return await axios.post(`https://discord.com/api/v9/webhooks/${this.client.user!.id}/${this.token}`, DATA);
  }

  // Get the discord.js channel
  get channel() {
    if (!this.channel_id) return undefined;
    let channel = this.guild?.channels.cache.get(this.channel_id);
    if (!channel?.isText()) return;
    return channel;
  }
  // Get the discord.js guild
  get guild() {
    if (!this.guild_id) return undefined;
    const cachedGuild = this.client.guilds.cache.get(this.guild_id);
    if (!cachedGuild) {
      console.log(`Fetching guild: ${this.guild_id}`);
      this.client.guilds.fetch(this.guild_id).then(() => {
        console.log(`Fetched guild: ${this.guild_id}`);
      });
      throw new Error("Fetching guild");
    }
    return cachedGuild;
  }
  // Get the discord.js member
  get member() {
    if (!this.raw_user?.id) return undefined;
    if (!this.raw_member) return undefined;
    if (!this.guild) return undefined;

    return this.guild.members.cache.get(this.raw_user.id) || this.guild.members.add(this.raw_member, true);
  }

  get user() {
    return this.client.users.cache.get(this.raw_user.id) || this.client.users.add(this.raw_user, true);
  }

  // DATABASE STUFF
  async getDbGuild(options?: DbUtils.db_fetch_options) {
    if (!this.guild_id) throw Error("No guild id on interaction found");
    return DbUtils.fetch(this.client, this.guild_id, options);
  }
  async updateDbGuild(model: any): Promise<any> {
    if (!this.guild_id) throw Error("No guild id on interaction found");
    let res = await DbUtils.update(this.client, this.guild_id, model);
    return res;
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
