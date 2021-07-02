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
  InteractionType,
  raw_received_application_command,
  raw_received_interaction,
  user_object,
  webhookOptions,
} from "../types";
import axios, { AxiosResponse } from "axios";
import * as DbUtils from "../utils/DbUtils";
import { InteractionData } from "./InteractionData";
import * as Silence from "../commands/Silence";
import { Interaction } from "./Interaction";

export class SlashCommand extends Interaction {
  type: InteractionType.ApplicationCommand;

  data: InteractionData;
  name: string;
  args: Array<ApplicationCommandInteractionDataOption>;
  mentions;

  constructor(client: FishyClient, raw_interaction: raw_received_application_command) {
    super(client, raw_interaction);

    this.type = raw_interaction.type;

    this.data = new InteractionData(client, raw_interaction.data!, this.guild);
    this.name = this.data.name;
    this.args = this.data.options!;
    this.mentions = this.data.mentions;
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
