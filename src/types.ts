import {
  APIMessage,
  Client,
  ClientEvents,
  Integration,
  Message,
  MessageEmbed,
  MessageOptions,
  PermissionResolvable,
  WSEventType,
} from "discord.js";
import { Model, MongooseDocument } from "mongoose";
import { emit } from "node:process";
import { FishyClient } from "./client";
import ButtonInteraction from "./structures/ButtonInteraction";
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
  info_channel_id?: Snowflake;

  disable_silence_mode?: boolean;
  disable_load_on_construct?: boolean;
  disable_command_handler?: boolean;
  disable_help_command?: boolean;
  disable_commands_command?: boolean;
  disable_interaction_load?: boolean;
  disable_db_connect?: boolean;
  disable_db_default_upsert?: boolean;
  disable_discord_error_catching?: boolean;
  disable_msg_notfound?: boolean;
  disable_msg_error?: boolean;
  dev_guild_id?: Snowflake;
}

export interface FishyEvent {
  trigger: WSEventType | string | keyof ClientEvents;
  run: FishyEventCode;
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
}

export interface FishyButtonCommand {
  run: FishyButtonCommandCode;
  config: FishyButtonCommandConfig;
}
export interface FishyCommandCode {
  (Client: FishyClient, interaction: Interaction): Promise<Message | Array<Message> | void | any>;
}
export interface FishyButtonCommandCode {
  (Client: FishyClient, interaction: ButtonInteraction): Promise<Message | Array<Message> | void | any>;
}

export interface FishyEventCode {
  (Client: FishyClient, data: any): Promise<void | any>;
}
export interface FishyCommandConfig {
  name: string;
  category?: string;
  bot_needed: boolean;
  bot_perms?: Array<PermissionResolvable>;
  user_perms?: Array<PermissionResolvable>;
  interaction_options: FishyApplicationCommand;
  custom?: any;
}
export interface FishyButtonCommandConfig {
  custom_id: string;
  user_perms?: Array<PermissionResolvable>;
  bot_needed?: boolean;
  atStart?: boolean;
  custom?: any;
}
export interface FishyApplicationCommand extends ApplicationCommand {
  user_perms?: Array<PermissionResolvable>;
  options?: Array<FishyApplicationCommandOption>;
  title?: string;
  usage?: string;
  color?: string;
  help_embed?: MessageEmbed;
}
export interface FishyApplicationCommandOption extends ApplicationCommandOption {
  user_perms?: Array<PermissionResolvable>;
  title?: string;
  usage?: string;
  color?: string;
  help_embed?: MessageEmbed;
  options?: Array<FishyApplicationCommandOption>;
}

export interface raw_interaction {
  name: string;
  description: string;
  options?: Array<ApplicationCommandOption>;
}

export interface raw_received_interaction {
  id: string;
  type: 2;
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
  ChannelMessageWithSource = 4, // SENDS normal message
  DeferredChannelMessageWithSource = 5, // AKA is thinking message
  DeferredUpdateMessage = 6, // ACK without a loading state
  UpdateMessage = 7, // Update the original message
}
export interface InteractionApplicationCommandCallbackData {
  tts?: boolean;
  content?: string;
  embeds?: Array<MessageEmbed>;
  allowed_mentions?: any;
  components?: Array<ComponentActionRow | ComponentButton>;
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
  "MENTIONABLE" = 9,
}
export enum InteractionType {
  Ping = 1,
  ApplicationCommand = 2,
  Button = 3,
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

export interface raw_received_button_interaction {
  id: string;
  type: 3;
  data: ComponentData;
  member: guild_member_object;
  message: message_object;
  guild_id: string;
  channel_id: string;
  user: user_object;
  token: string;
  version: number;
}
export interface ComponentData {
  custom_id: string;
  component_type: 2;
}
export interface ComponentActionRow {
  type: ComponentType.ActionRow;
  components: ComponentButton[];
}
export interface ComponentButton {
  type: ComponentType.Button;
  label?: string;
  style: ComponentStyle;
  custom_id?: string;
  url?: "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  emoji?: {
    name?: string;
    id?: string; // TODO: make this better
  };
  disabled?: boolean;
}
export enum ComponentType {
  ActionRow = 1,
  Button = 2,
}
export enum ComponentStyle {
  Primary = 1,
  Secondary = 2,
  Success = 3,
  Danger = 4,
  Link = 5,
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
  type: channel_types;
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

  GUILD_NEWS_THREAD = 10,
  GUILD_PUBLIC_THREAD = 11,
  GUILD_PRIVATE_THREAD = 12,
  GUILD_STAGE_VOICE = 13,
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
export interface message_object {
  type: number;
  tts?: number;
  timestamp: string;
  pinned?: boolean;
  mentions: [];
  mention_roles: [];
  mention_everyone: boolean;
  id: string;
  flags: number;
  embeds?: any;
  edited_timestamp?: string;
  content?: string;
  channel_id: string;
  author: user_object;
  attachments: any[];
}

type Snowflake = string;
