import { Client, Integration, Message, MessageEmbed, PermissionResolvable } from "discord.js";
import { Model, MongooseDocument } from "mongoose";
import { emit } from "node:process";
import { FishyClient } from "./client";
import { Interaction } from "./structures/Interaction";

// ALLLL THE TYPES

export interface FishyClientOptions {
  token: string;

  db_uri: string;
  guild_model: Model<any, any>;

  author: string;
  cmd_dir?: string;
  cmd_array?: Array<FishyCommand>;
  event_dir?: string;
  event_array?: Array<FishyEvent>;
  //disable_category_import?: boolean;
  disable_load_on_construct?: boolean;
  disable_command_handler?: boolean;
  disable_help_command?: boolean;
  disable_interaction_load?: boolean;
  disable_db_connect?: boolean;
  disable_db_default_upsert?: boolean;
  disable_discord_error_catching?: boolean;
}

export interface FishyEvent {
  trigger: string;
  run: Function;
}

export interface CommandCategory {
  name: string;
  description: string;
  commands?: Array<string>;
  help_embed?: MessageEmbed;
  help_embed_title?: string;
  help_embed_color?: string;
}

export interface FishyCommand {
  run: FishyCommandCode;
  config: FishyCommandConfig;
  help: FishyCommandHelp;
}
export interface FishyCommandCode {
  (Client: FishyClient, interaction: Interaction): Promise<Message | Array<Message> | void | any>;
}
export interface FishyCommandConfig {
  name: string;
  category?: string;
  bot_needed: boolean;
  bot_perms?: Array<PermissionResolvable>;
  user_perms?: Array<PermissionResolvable>;
  interaction_options: ApplicationCommand;
}
export interface FishyCommandHelp {
  title?: string;
  description: string;
  usage: string;
  color?: string;
  help_embed?: MessageEmbed;
}
export interface raw_interaction {
  name: string;
  description: string;
  options?: Array<ApplicationCommandOption>;
}

export interface raw_recieved_interaction {
  id: string;
  type: InteractionType;
  data?: ApplicationCommandInteractionData;
  guild_id?: string;
  channel_id?: string;
  member?: guild_member_object;
  user?: user_object;
  token: string;
  version: number;
}

export interface ApplicationCommand {
  id?: string;
  application_id?: string;
  name: string;
  description: string;
  options?: Array<ApplicationCommandOption>;
}

export interface InteractionResponse {
  type: InteractionResponseType;
  data?: InteractionApplicationCommandCallbackData;
}

export enum InteractionResponseType {
  Pong = 1,
  ChannelMessageWithSource = 4,
  DeferredChannelMessageWithSource = 5,
}
export interface InteractionApplicationCommandCallbackData {
  tts?: boolean;
  content?: string;
  embeds?: Array<MessageEmbed>;
  allowed_mentions?: any;
  flags?: InteractionApplicationCommandCallbackDataFlags;
}

export enum InteractionApplicationCommandCallbackDataFlags {
  None = 0,
  Ephemeral = 1 << 8,
}

export interface ApplicationCommandInteractionData {
  id: string;
  name: string;
  options?: Array<ApplicationCommandInteractionDataOption>;
  resolved?: ApplicationCommandInteractionResolved;
}

export interface ApplicationCommandInteractionResolved {
  members?: { [key: string]: guild_member_object };
  users?: { [key: string]: user_object };
  channels?: { [key: string]: channel_object };
  roles?: { [key: string]: role_object };
}

export interface ApplicationCommandInteractionDataOption {
  name: string;
  value?: string | boolean | number;
  type?: ApplicationCommandOptionType;
  options?: Array<ApplicationCommandInteractionDataOption>;
}
export enum ApplicationCommandOptionType {
  "SUB_COMMAND" = 1,
  "SUB_COMMAND_GROUP" = 2,
  "STRING" = 3,
  "INTEGER" = 4,
  "BOOLEAN" = 5,
  "USER" = 6,
  "CHANNEL" = 7,
  "ROLE" = 8,
}
export enum InteractionType {
  Ping = 1,
  ApplicationCommand = 2,
}

export interface ApplicationCommandOption {
  type: ApplicationCommandOptionType;
  name: string;
  description: string;
  required?: boolean;
  choices?: Array<ApplicationCommandOptionChoice>;
  options?: Array<ApplicationCommandOption>;
}
export interface ApplicationCommandOptionChoice {
  name: string;
  value: string | number;
}

// Non interaction discord interfaces
export interface guild_member_object {
  user?: user_object;
  nick?: string;
  roles: Array<string>;
  joined_at: string;
  permium_since?: string;
  deaf: boolean;
  mute: boolean;
  pending?: boolean;
  permissions?: string;
}
export interface user_object {
  username: string;
  id: string;
  discriminator: string;
  avatar?: string;
  bot?: boolean;
  system?: boolean;
  mfa_enabled?: boolean;
  locale?: string;
  verified?: boolean;
  email?: string;
  flags?: number;
  premium_type?: number;
  public_flags?: number;
}
export interface role_object {
  id: Snowflake;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string;
  managed: boolean;
  mentionable: boolean;
  tags?: role_tags_object;
}
export interface role_tags_object {
  bot_id?: Snowflake;
  integration_id?: Snowflake;
  premium_subscriber?: null;
}

export interface channel_object {
  id: Snowflake;
  type: number;
  guild_id?: Snowflake;
  position?: number;
  permission_overwrites: Array<permission_overwrites>;
  name?: string;
  topic?: string | undefined;
  nsfw?: boolean;
  last_message_id?: Snowflake | undefined;
  bitrate?: number;
  user_limit?: number;
  rate_limit_per_user?: number;
  recipients?: Array<user_object>;
  icon?: string | undefined;
  owner_id?: Snowflake;
  application_id?: Snowflake;
  parent_id?: Snowflake | undefined;
  last_pin_timestamp?: string;
}

export enum channel_types {
  GUILD_TEXT = 0,
  DM = 1,
  GUILD_VOICE = 2,
  GROUP_DM = 3,
  GUILD_CATEGORY = 4,
  GUILD_NEWS = 5,
  GUILD_STORE = 6,
}

export interface permission_overwrites {
  id: Snowflake;
  type: permission_overwritesType;
  allow: string;
  deny: string;
}
export enum permission_overwritesType {
  ROLE = 0,
  MEMBER = 1,
}

export interface webhookOptions {
  content?: string;
  username?: string;
  avatar_url?: string;
  tts?: boolean;
  file?: any;
  embeds?: Array<MessageEmbed>;
  payload_json?: string;
  allowed_mentions?: any;
}

type Snowflake = string;
