import { Channel, Collection, Guild, GuildChannel, GuildMember, Role, User } from "discord.js";
import { FishyClient } from "..";
import {
  ApplicationCommandInteractionData,
  ApplicationCommandInteractionDataOption,
  ApplicationCommandInteractionResolved,
} from "../types";

export class InteractionData {
  id;
  name;
  resolved;
  data;
  client;
  guild;
  constructor(client: FishyClient, data: ApplicationCommandInteractionData, guild?: Guild) {
    this.data = data;
    this.id = this.data.id;
    this.name = this.data.name;
    this.resolved = this.data.resolved;
    this.client = client;
    this.guild = guild;
  }
  get options() {
    if (!this.data.options) return [];
    else return this.data.options.map((option) => new InteractionDataOption(option));
  }
  get mentions() {
    if (!this.data.resolved) return undefined;
    return new InteractionDataMentions(this.client, this.data.resolved, this.guild);
  }
}

export class InteractionDataMentions {
  data;
  client;
  guild;
  constructor(client: FishyClient, resolve_data: ApplicationCommandInteractionResolved, guild?: Guild) {
    this.data = resolve_data;
    this.client = client;
    this.guild = guild;
  }
  get channels(): Collection<string, Channel> | undefined {
    if (!this.data.channels) return undefined;
    let collection = new Collection<string, Channel>();
    Object.values(this.data.channels).map((channel) => collection.set(channel.id, this.client.channels.add(channel)));
    return collection;
  }
  get members(): Collection<string, GuildMember> | undefined {
    if (!this.data.members) return undefined;
    if (!this.guild) throw new Error("Resolved member in data, but no guild");
    let collection = new Collection<string, GuildMember>();
    Object.entries(this.data.members).map((member) => {
      const user = this.data?.users?.[member[0]];
      if (!user) throw new Error("Resolved member in data, but no user");
      member[1].user = user;
      collection.set(member[0], this.guild!.members.add(member[1]));
    });
    return collection;
  }
  get users(): Collection<string, User> | undefined {
    if (!this.data.users) return undefined;
    let collection = new Collection<string, User>();
    Object.values(this.data.users).map((user) => collection.set(user.id, this.client.users.add(user)));
    return collection;
  }
  get roles(): Collection<string, Role> | undefined {
    if (!this.data.roles) return undefined;
    if (!this.guild) throw new Error("Resolved role in data, but no guild");
    let collection = new Collection<string, Role>();
    console.log(this.data.roles);
    Object.values(this.data.roles).map((role) => {
      //@ts-ignore
      role.permissions = Number.parseInt(role.permissions);
      const Role = this.guild!.roles.add(role);
      collection.set(role.id, Role);
    }); //TODO: do this better
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
