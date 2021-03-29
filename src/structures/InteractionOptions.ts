import { Collection } from "discord.js";
import { ApplicationCommandInteractionData, ApplicationCommandInteractionDataOption, ApplicationCommandInteractionResolved } from "../types";

export class InteractionData {
  id;
  name;
  resolved;
  data;
  constructor(data: ApplicationCommandInteractionData) {
    this.data = data;
    this.id = this.data.id;
    this.name = this.data.name;
    this.resolved = this.data.resolved;
  }
  get options() {
    if (!this.data.options) return [];
    else return this.data.options.map((option) => new InteractionDataOption(option));
  }
  get mentions(){
    if(!this.data.resolved) return undefined;
    return new InteractionDataMentions(this.data.resolved);
  }
}


// TODO: Does this work?
export class InteractionDataMentions{
  data;
  constructor(resolve_data: ApplicationCommandInteractionResolved){
    this.data = resolve_data;
  }
  get channels(){
    if(!this.data.channels) return undefined;
    let collection = new Collection();
    Object.values(this.data.channels).map(channel=>collection.set(channel.id, channel))
    return collection;
  }
  get members(){
    if(!this.data.members) return undefined;
    let collection = new Collection();
    Object.keys(this.data.members).map(member_id=>collection.set(member_id, this.data.members![member_id]))
    return collection;
  }
  get users(){
    if(!this.data.users) return undefined;
    let collection = new Collection();
    Object.values(this.data.users).map(user=>collection.set(user.id, user))
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
