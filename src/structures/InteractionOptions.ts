import { Channel, Collection, GuildChannel } from "discord.js";
import { FishyClient } from "..";
import {
  ApplicationCommandInteractionData,
  ApplicationCommandInteractionDataOption,
  ApplicationCommandInteractionResolved,
  channel_object,
  guild_member_object,
  role_object,
  user_object,
} from "../types";

export class InteractionData {
  id;
  name;
  resolved;
  data;
  client;
  constructor(client: FishyClient, data: ApplicationCommandInteractionData) {
    this.data = data;
    this.id = this.data.id;
    this.name = this.data.name;
    this.resolved = this.data.resolved;
    this.client = client;
  }
  get options() {
    if (!this.data.options) return [];
    else return this.data.options.map((option) => new InteractionDataOption(option));
  }
  get mentions() {
    if (!this.data.resolved) return undefined;
    return new InteractionDataMentions(this.client, this.data.resolved);
  }
}

export class InteractionDataMentions {
  data;
  client;
  constructor(client: FishyClient, resolve_data: ApplicationCommandInteractionResolved) {
    this.data = resolve_data;
    this.client = client;
  }
  get channels(): Collection<string, channel_object> | undefined {
    if (!this.data.channels) return undefined;
    let collection = new Collection<string, channel_object>();
    Object.values(this.data.channels).map((channel) => collection.set(channel.id, channel));
    return collection;
  }
  get members(): Collection<string, guild_member_object> | undefined {
    if (!this.data.members) return undefined;
    let collection = new Collection<string, guild_member_object>();
    Object.keys(this.data.members).map((member_id) => collection.set(member_id, this.data.members![member_id]));
    return collection;
  }
  get users(): Collection<string, user_object> | undefined {
    if (!this.data.users) return undefined;
    let collection = new Collection<string, user_object>();
    Object.values(this.data.users).map((user) => collection.set(user.id, user));
    return collection;
  }
  get roles(): Collection<string, role_object> | undefined {
    if (!this.data.roles) return undefined;
    let collection = new Collection<string, role_object>();
    Object.values(this.data.roles).map((role) => collection.set(role.id, role));
    return collection;
  }
}

export class InteractionDataOption {
  data;
  name;
  value;
  type;
  constructor(data: ApplicationCommandInteractionDataOption) {
    this.data = data;
    this.name = this.data.name;
    this.value = this.data.value;
    this.type = this.data.type!;
  }
  get options() {
    if (!this.data.options) return [];
    else return this.data.options.map((option) => new InteractionDataOption(option));
  }
}
