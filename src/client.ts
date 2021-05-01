import { Client, ClientOptions, Collection, Constants, Message, MessageEmbed, PermissionResolvable } from "discord.js";
import {
  ApplicationCommand,
  ApplicationCommandOption,
  ApplicationCommandOptionChoice,
  ApplicationCommandOptionType,
  CommandCategory,
  FishyApplicationCommand,
  FishyApplicationCommandOption,
  FishyClientOptions,
  FishyCommand,
  FishyCommandConfig,
  FishyEvent,
  permission_overwritesType,
  raw_interaction,
  raw_received_interaction,
  user_object,
} from "./types";
import * as fs from "fs";
import { join } from "path";
import { Interaction } from "./structures/Interaction";
import axios from "axios";
import { ApplicationCommandBuild, ApplicationCommandCompare } from "./utils/ApplicationCommandCompare";
import { ErrorEmbed, WarnEmbed } from "./utils/Embeds";
import mongoose, { Model } from "mongoose";
import { InteractionDataOption } from "./structures/InteractionOptions";

import * as SilenceCommand from "./commands/Silence";
import * as CommandsCommand from "./commands/Commands";
// The main client!
export class FishyClient extends Client {
  fishy_options: FishyClientOptions;
  GuildModel: Model<any, any>;
  public commands: Collection<string, FishyCommand>;
  categories: Collection<string, CommandCategory>;
  constructor(options: FishyClientOptions, client_options?: ClientOptions) {
    super(client_options);
    this.commands = new Collection();
    this.categories = new Collection();
    this.fishy_options = options;

    // Checking for things
    if (!options.token) throw Error("You must specify a token");
    if (!options.db_uri && !options.disable_db_connect) throw Error("You must specify a database uri");
    if (!options.guild_model && !options.disable_db_connect) throw Error("You must specify a mongoose guild model");
    if (!options.guild_model.schema.path("id") && !options.disable_db_connect)
      throw Error("The mongoose model needs the 'id' path as a String");
    if (!options.guild_model.schema.path("settings") && !options.disable_db_connect)
      throw Error("The mongoose model needs the 'settings' path as a Map");
    //if (!options.event_array && !options.event_dir) throw Error("You must specify an event directory or event array");
    if (!options.cmd_array && !options.cmd_dir) throw Error("You must specify a command directory or command array");

    this.token = options.token;
    this.GuildModel = options.guild_model;

    //Loading commands and events
    if (!options.disable_load_on_construct) this.load();

    process.on("SIGINT", async () => {
      await this.logToChannel("SIGINT signal received: stopping bot");
      console.log("SIGINT signal received: stopping bot");
      await Promise.all([this.destroy(), mongoose.disconnect()]);
      await new Promise((resolve) => {
        setTimeout(() => {
          resolve("");
        }, 1000);
      });
      console.log("exiting");
      process.exit();
    });
  }

  // Loads the events from a given event_dir
  async load_events(directory?: string) {
    return new Promise((resolve, reject) => {
      if (directory) {
        fs.readdir(join(process.cwd(), directory), (err, files) => {
          if (err) return;
          files.forEach((file, index, array) => {
            const event: FishyEvent = require(join(process.cwd(), directory, file));
            if (
              Object.keys(Constants.Events).includes(event.trigger.toUpperCase()) ||
              Object.values(Constants.Events)
                .map((v) => v.toLowerCase())
                .includes(event.trigger.toLowerCase())
            ) {
              this.on(event.trigger, event.run.bind(null, this));
            } else {
              // @ts-ignore
              this.ws.on(event.trigger, event.run.bind(null, this));
            }
            if (index === array.length - 1) resolve(true);
          });
        });
      } else {
        resolve(false);
      }
    });
  }
  // Loads the commands from a given cmd_dir
  async load_commands(directory?: string) {
    return new Promise(async (resolve, reject) => {
      if (directory) {
        try {
          const dirs = await fs.promises.readdir(join(process.cwd(), directory));

          // Go through all the subdirecoties (categories)
          dirs.forEach(async (dir, dir_index, dir_array) => {
            const category_path = join(process.cwd(), directory!, dir);

            let files = await fs.promises.readdir(category_path);
            if (!files) {
              if (dir_index === dir_array.length - 1) resolve(true);
              return;
            }
            // Find a the index file for a category
            // That file says what the category does and that kind of stuff
            let index_path = files.find((file) => file.startsWith("index.") && !file.endsWith(".d.ts"));
            let category: CommandCategory | undefined = undefined;
            // Create a anew category if an index file was found
            if (index_path) {
              category = require(join(category_path, index_path));
              if (category) {
                category.commands = category.commands ?? [];
                this.categories.set(category.name, category);
              }
            }
            // Go through all the files in the direcory
            files.forEach((file, file_index, file_array) => {
              // Ignore all the non js/ts files, and the index file
              if (
                (file.endsWith(".js") || file.endsWith(".ts")) &&
                !file.startsWith("index.") &&
                !file.endsWith(".d.ts")
              ) {
                let command_path: string = join(category_path, file);
                let new_command: FishyCommand = require(command_path);
                // If the command doesnt have a given category, make the directory name its category
                if (!new_command.config.category) {
                  new_command.config.category = dir;
                }
                // Check if the category already exists, and doesnt include the command already
                if (
                  this.categories.has(new_command.config.category) &&
                  !this.categories.get(new_command.config.category)!.commands!.includes(new_command.config.name)
                ) {
                  let old_category = this.categories.get(new_command.config.category)!;
                  old_category.commands!.push(new_command.config.name);
                  this.categories.set(new_command.config.category, old_category);
                }
                // Adds the command to the command Collection
                this.commands.set(new_command.config.name.toLowerCase(), new_command);
              }
              // If this was the last file, resolve
              if (file_index === file_array.length - 1 && dir_index === dir_array.length - 1) resolve(true);
            });
          });
        } catch (err) {
          throw err;
        }
      } else {
        resolve(false);
      }
    });
  }
  // Loads interactions and updates them with discord if needed
  async load_interactions(force_update?: boolean, user_id?: string) {
    // Fetch discord user for getting the user id
    if (!user_id) {
      const userdataPath = `https://discord.com/api/v8/users/@me`;
      const userdata = await axios.get(userdataPath, {
        headers: { Authorization: `Bot ${this.token}` },
      });
      const user: user_object = userdata.data;
      user_id = user.id;
    }
    let SlashCommandsUrl: string;
    if (this.fishy_options.dev_guild_id) {
      SlashCommandsUrl = `https://discord.com/api/v8/applications/${user_id}/guilds/${this.fishy_options.dev_guild_id}/commands`;
    } else {
      SlashCommandsUrl = `https://discord.com/api/v8/applications/${user_id}/commands`;
    }

    if (force_update) {
      this.commands.forEach((command) => {
        const interaction = command.config.interaction_options;
        axios
          .post(SlashCommandsUrl, interaction, {
            headers: { Authorization: `Bot ${this.token}` },
          })
          .catch((err) => {
            console.log(`\nError:`);
            console.log(err);
            console.log(interaction);
            console.log(err.response);
          });
      });
    } else {
      const discordSlashCommandsData = await axios.get(SlashCommandsUrl, {
        headers: { Authorization: `Bot ${this.token}` },
      });
      const discordSlashCommands: Array<ApplicationCommand> = discordSlashCommandsData.data;

      let botSlashCommands = this.commands.map((command) => command.config.interaction_options);
      let discord_done: Array<string> = [];
      botSlashCommands.forEach((fishyBotSlashCommand) => {
        const botSlashCommand = ApplicationCommandBuild(fishyBotSlashCommand);
        let discord_command = discordSlashCommands.find((cmd) => cmd.name == botSlashCommand.name);
        if (!discord_command)
          return axios
            .post(SlashCommandsUrl, botSlashCommand, {
              headers: { Authorization: `Bot ${this.token}` },
            })
            .then((res) => console.log(`POST - ${res.status} Interaction: "${botSlashCommand.name}", `))
            .catch((err) => {
              console.log(err.response);
              console.log(err.response.status);
            });
        discord_done.push(discord_command.id!);
        if (!ApplicationCommandCompare(botSlashCommand, discord_command))
          return axios
            .patch(SlashCommandsUrl + `/${discord_command.id}`, botSlashCommand, {
              headers: { Authorization: `Bot ${this.token}` },
            })
            .then((res) => console.log(`PATCH - ${res.status} Interaction: "${botSlashCommand.name}", `))
            .catch((err) => {
              console.log(err.response);
              console.log(err.response.status);
            });
      });
      discordSlashCommands.forEach((cmd) => {
        if (!discord_done.includes(cmd.id!)) {
          axios
            .delete(SlashCommandsUrl + `/${cmd.id}`, {
              headers: { Authorization: `Bot ${this.token}` },
            })
            .then((res) => console.log(`DELETE - ${res.status} Interaction: "${cmd.name}", `))
            .catch((err) => {
              console.log(err.response);
              console.log(err.response.status);
            });
        }
      });
    }
  }
  // Load the interaction command handler
  async load_commandhandler() {
    // @ts-ignore
    this.ws.on("INTERACTION_CREATE", async (raw_interaction: raw_received_interaction) => {
      let interaction = new Interaction(this, raw_interaction);
      let command = this.commands.get(interaction.name);
      if (!command) {
        if (!this.fishy_options.disable_msg_notfound)
          interaction.sendSilent(
            `This interaction doesn't seem to exist, if you think this is a mistake, please contact ${this.fishy_options.author}`
          );
        return;
      }
      if (command.config.bot_needed === true) {
        if (!interaction.guild) {
          return interaction.sendSilent(`To use this command add the bot to a server`);
        }
      }
      if (command.config.bot_perms?.[0]) {
        let failed = false;
        command.config.bot_perms.forEach((perm) => {
          if (!interaction.guild!.me?.hasPermission(perm)) {
            failed = true;
          }
        });
        if (failed) {
          return interaction.sendSilent(
            `The bot doesn't have the required permissions to run this command\nPermissions needed: \`${command.config.bot_perms.join(
              ", "
            )}\``
          );
        }
      }

      if (command.config.user_perms?.[0]) {
        function check_perms(perms: Array<PermissionResolvable>) {
          let failed = false;
          perms.forEach((perm) => {
            if (!interaction.member!.hasPermission(perm)) {
              failed = true;
            }
          });
          return !failed;
        }

        if (command.config.user_perms?.[0] && !check_perms(command.config.user_perms)) {
          return interaction.sendSilent(
            `You do not have the required permissions to run this command.\nPermissions required: \`${command.config.user_perms.join(
              ", "
            )}\``
          );
        } else if (interaction.data.options?.[0] && command.config.interaction_options.options?.[0]) {
          function check_option_perms(
            interaction_options: Array<InteractionDataOption>,
            config_options: Array<FishyApplicationCommandOption>
          ): boolean {
            if (!interaction_options?.[0] || !config_options?.[0]) return true;
            interaction_options.forEach((option) => {
              const conf_option = config_options.find((opt) => opt.name == option.name);
              if (conf_option) {
                if (conf_option.user_perms && !check_perms(conf_option.user_perms)) {
                  interaction.sendSilent(
                    `You do not have the required permissions to run this command.\nPermissions required: \`${conf_option.user_perms.join(
                      ", "
                    )}\``
                  );
                  return false;
                }
                if (option.options?.[0] && conf_option.options?.[0]) {
                  return check_option_perms(option.options, conf_option.options);
                }
              }
            });
            return true;
          }
          if (!check_option_perms(interaction.data.options, command.config.interaction_options.options)) {
            return;
          }
        }
      }

      try {
        await command.run(this, interaction);
      } catch (err) {
        console.error(err);
        if (!this.fishy_options.disable_msg_error) return;
        let msg = `An error seems to have occurred in the command \`${interaction.name}\`: \n\`\`\`${err}\`\`\``;
        let embed = new ErrorEmbed(
          `An error seems to have occurred in the command: "${interaction.name}"`,
          `Reason: \n\`\`\`${err}\`\`\``
        );
        if (interaction.response_used) {
          interaction.send_webhook(embed);
        } else {
          interaction.sendSilent(msg);
        }
      } finally {
      }
    });
  }
  // Generate a help command
  async help_command(): Promise<FishyCommand> {
    const info_cat = this.categories.get("info");
    if (info_cat) {
      if (info_cat.commands) {
        info_cat.commands.push("help");
      } else {
        info_cat.commands = ["help"];
      }
      this.categories.set("info", info_cat);
    }
    let cmd: FishyCommand = {
      config: {
        category: "info",
        bot_needed: false,
        name: "help",
        interaction_options: {
          name: "help",
          description: "Info about the bot commands and categories",
          usage: "/help category info | /help command ping",
          options: [
            {
              name: "help",
              description: "Basic help command",
              type: ApplicationCommandOptionType.SUB_COMMAND,
            },
            {
              name: "category",
              description: "To get help about a category",
              type: ApplicationCommandOptionType.SUB_COMMAND_GROUP,
              options: this.categories.map((category) => {
                let obj: ApplicationCommandOption = {
                  name: category.name,
                  description: category.description,
                  type: ApplicationCommandOptionType.SUB_COMMAND,
                  options: [
                    {
                      name: "command",
                      description: "command to select",
                      type: ApplicationCommandOptionType.STRING,
                      choices: category.commands?.map((command) => {
                        let choice: ApplicationCommandOptionChoice = {
                          name: command,
                          value: "cmd_" + command,
                        };
                        return choice;
                      }),
                    },
                  ],
                };
                return obj;
              }),
            },
            {
              name: "command",
              description: "Get help about a specific command",
              type: ApplicationCommandOptionType.SUB_COMMAND,
              options: [
                {
                  name: "name",
                  description: "The command's name",
                  required: true,
                  type: ApplicationCommandOptionType.STRING,
                },
              ],
            },
          ],
        },
      },
      run: async (client, interaction) => {
        let cmd_help = (input: string): MessageEmbed => {
          let input_split = input.split(/(?:,|\s+|\.)/gi);
          let cmd = this.commands.get(input_split.shift() || "");
          const cmd_name = cmd?.config.name || cmd?.config.interaction_options.name;
          if (!cmd) {
            return new ErrorEmbed(`No command found with the name "${input.split(/(,|\s|\.|:)/gi)[0]}"`);
          }
          if (cmd.config.interaction_options.help_embed) return cmd.config.interaction_options.help_embed;
          let cmd_title = cmd.config.name;
          let interaction_config: FishyApplicationCommandOption | FishyApplicationCommand =
            cmd.config.interaction_options;
          if (input_split[0] && interaction_config) {
            let current = input_split.shift();
            while (current) {
              if (!interaction_config) {
                return new ErrorEmbed(`The command \"${cmd.config.name}\" doesn't have any subcommands`);
              }
              let option: FishyApplicationCommandOption | undefined = interaction_config.options?.find(
                (opt) => opt.name.toLowerCase() === current!.trim().toLowerCase()
              );
              if (!option) {
                return new ErrorEmbed(
                  `The subcommand \"${current.trim().toLowerCase()}\" doesn't exist on "${cmd.config.name}"`,
                  `You can run \`/help command ${cmd}\``
                );
              } else if (option) {
                interaction_config = option;
                cmd_title += ` ${option.name}`;
              }

              current = input_split.shift();
            }
          }

          let embed = new MessageEmbed().setAuthor(
            this.user!.tag,
            this.user!.displayAvatarURL(),
            `https://discord.com/oauth2/authorize?client_id=${
              this.user!.id
            }&permissions=8&scope=bot%20applications.commands`
          );

          if (interaction_config.color) embed.setColor(interaction_config.color);
          else embed.setColor(this.categories.get(cmd.config.category || "")?.help_embed_color || "RANDOM");
          if (interaction_config.title) embed.setTitle(interaction_config.title);
          else embed.setTitle(`'/${cmd_title}' - Command Help`);
          let desc = `${interaction_config.description}\n 
Usage: \`${interaction_config.usage || `/${generateUsage(cmd_title, interaction_config)}` || "no specific usage"}\`
User required perms: \`${interaction_config.user_perms?.join(", ") || "None"}\`
Bot user needed: \`${cmd.config.bot_needed}\`
`;
          const subcommands: Array<string> = [];

          if (
            interaction_config.options?.find(
              (opt) =>
                opt.type === ApplicationCommandOptionType.SUB_COMMAND ||
                opt.type === ApplicationCommandOptionType.SUB_COMMAND_GROUP
            )
          ) {
            interaction_config.options?.forEach((opt) => {
              if (opt.type === ApplicationCommandOptionType.SUB_COMMAND) {
                subcommands.push(`${cmd_title} ${opt.name}`);
              } else if (opt.type === ApplicationCommandOptionType.SUB_COMMAND_GROUP && opt.options?.[0]) {
                opt.options.forEach((opt2) => {
                  if (opt2.type === ApplicationCommandOptionType.SUB_COMMAND) {
                    subcommands.push(`${cmd_title} ${opt.name} ${opt2.name}`);
                  }
                });
              }
            });
            desc += `Sub-Commands: \n\`${subcommands?.[0] ? subcommands.join("`,\n`") : "None"}\``;
          }
          embed.setDescription(desc);
          embed.setFooter(`bot perms: ${cmd.config.bot_perms?.join(", ") || "None"} `);
          return embed;
        };
        let cat_help = (cat_name: string): MessageEmbed => {
          if (!cat_name) return new ErrorEmbed(`Category "${cat_name}" not found`);
          let cat = this.categories.get(cat_name);
          if (!cat) {
            cat = this.categories.get(cat_name.toLowerCase());
            if (!cat) {
              cat = this.categories.get(
                this.categories.keyArray()[
                  this.categories
                    .keyArray()
                    .map((key) => key.toLowerCase())
                    .indexOf(cat_name.toLowerCase())
                ]
              );
              if (!cat) {
                return new ErrorEmbed(`No category found for: "${cat_name}"`);
              }
            }
          }

          if (cat.help_embed) return cat.help_embed;
          let embed = new MessageEmbed().setAuthor(
            this.user!.tag,
            this.user!.displayAvatarURL(),
            `https://discord.com/oauth2/authorize?client_id=${
              this.user!.id
            }&permissions=8&scope=bot%20applications.commands`
          );

          if (cat.help_embed_color) embed.setColor(cat.help_embed_color);
          else embed.setColor("RANDOM");
          if (cat.help_embed_title) embed.setTitle(cat.help_embed_title);
          else embed.setTitle(`${cat.name} - Category Help`);
          embed.setDescription(`${cat.description}
${cat.commands
  ?.map((command_name) => {
    let cmd = this.commands.get(command_name);

    if (cmd) {
      const interaction = cmd.config.interaction_options;
      if (
        interaction.options?.find(
          (opt) =>
            opt.type === ApplicationCommandOptionType.SUB_COMMAND ||
            opt.type === ApplicationCommandOptionType.SUB_COMMAND_GROUP
        )
      ) {
        let strings: Array<string> = [];
        interaction.options.forEach((opt) => {
          if (opt.type === ApplicationCommandOptionType.SUB_COMMAND) {
            strings.push(`**${command_name} ${opt.name}** \`${opt.description}\``);
          } else if (opt.type === ApplicationCommandOptionType.SUB_COMMAND_GROUP && opt.options?.[0]) {
            opt.options.forEach((opt2) => {
              if (opt2.type === ApplicationCommandOptionType.SUB_COMMAND) {
                strings.push(`**${command_name} ${opt.name} ${opt2.name}** \`${opt.description}\``);
              }
            });
          }
        });
        return strings.join("\n");
      } else {
        let description = cmd?.config.interaction_options.description;
        return `**${command_name}** \`${description}\``;
      }
    }
    return `**${command_name}**`;
  })
  ?.join("\n")}
`);
          return embed;
        };
        if (interaction.data.options.find((arg) => arg.name == "category")) {
          let cat_arg = interaction.data.options.find((arg) => arg.name == "category");
          if (cat_arg?.options?.[0]) {
            if (
              typeof cat_arg.options[0].options?.[0]?.value === "string" &&
              cat_arg.options[0].options?.[0].value?.startsWith("cmd_")
            ) {
              let cmd_name = cat_arg.options[0].options[0].value.slice(4);
              let cmd = this.commands.get(cmd_name);
              if (!cmd?.config?.name) {
                return interaction.send(new ErrorEmbed(`Command "${cmd_name}" not found`));
              }
              interaction.send(cmd_help(cmd_name));
            } else {
              let cat_name = cat_arg.options[0].name;
              interaction.send(cat_help(cat_name));
            }
          }
        } else if (interaction.data.options.find((arg) => arg.name == "command")?.options?.[0]?.name === "name") {
          let cmd_name = interaction.data.options.find((arg) => arg.name == "command")!.options![0].value;
          if (!cmd_name || typeof cmd_name !== "string") {
            return interaction.send(new ErrorEmbed(`Command "${cmd_name}" not found`));
          }
          interaction.send(cmd_help(cmd_name));
        } else {
          const embed = new MessageEmbed().setTitle("Help page").setDescription(`**Current categories:**
          ${this.categories
            .map(
              (val, key) =>
                `**${val.name}**\nDesc: \`${val.description}\`\nCommands: ${
                  val.commands
                    ?.map((command_name) => {
                      let command = this.commands.get(command_name);
                      const interaction = command?.config.interaction_options;
                      if (!command || !interaction) return `\`${command_name}\``;
                      else if (
                        interaction.options?.find(
                          (opt) =>
                            opt.type === ApplicationCommandOptionType.SUB_COMMAND ||
                            opt.type === ApplicationCommandOptionType.SUB_COMMAND_GROUP
                        )
                      ) {
                        let strings: Array<string> = [];
                        interaction.options.forEach((opt) => {
                          if (opt.type === ApplicationCommandOptionType.SUB_COMMAND) {
                            strings.push(`\`${command_name} ${opt.name}\``);
                          } else if (opt.type === ApplicationCommandOptionType.SUB_COMMAND_GROUP && opt.options?.[0]) {
                            opt.options.forEach((opt2) => {
                              if (opt2.type === ApplicationCommandOptionType.SUB_COMMAND) {
                                strings.push(`\`${command_name} ${opt.name} ${opt2.name}\``);
                              }
                            });
                          }
                        });
                        return strings.join(", ");
                      } else {
                        return `\`${command_name}\``;
                      }
                    })
                    .join(", ") || "`None`"
                }`
            )
            .join("\n")}
          `);
          embed.setAuthor(
            this.user!.tag,
            this.user!.displayAvatarURL(),
            `https://discord.com/oauth2/authorize?client_id=${
              this.user!.id
            }&permissions=8&scope=bot%20applications.commands`
          );
          embed.setColor("RANDOM");
          embed.setTimestamp();
          interaction.send(embed);
        }
      },
    };
    return cmd;
  }

  // Load normal commands
  load_silence_command() {
    this.commands.set(SilenceCommand.config.name, SilenceCommand);
    const info_cat = this.categories.get("info");
    if (info_cat) {
      if (info_cat.commands) {
        info_cat.commands.push("silence");
      } else {
        info_cat.commands = ["silence"];
      }
      this.categories.set("info", info_cat);
    }
  }
  load_commands_command() {
    this.commands.set(CommandsCommand.config.name, CommandsCommand);
    const info_cat = this.categories.get("info");
    if (info_cat) {
      if (info_cat.commands) {
        info_cat.commands.push("commands");
      } else {
        info_cat.commands = ["commands"];
      }
      this.categories.set("info", info_cat);
    }
  }

  // Connect to the mongo db database
  async load_db() {
    try {
      mongoose.connect(this.fishy_options.db_uri, { useNewUrlParser: true, useUnifiedTopology: true });
    } catch (err) {
      console.log(err);
      throw Error("Failed to connect to the MongoDB server: \n" + err);
    } finally {
      return;
    }
  }
  // Catch discord errors
  async load_error_handler() {
    this.on("error", (err) => {
      this.logToChannel(new ErrorEmbed("Discord api error", err.message));
      console.error("DISCORD API ERROR!!!");
      console.log(err);
    });
    this.on("warn", (msg) => {
      this.logToChannel(new WarnEmbed("Discord api warn", msg));
      console.error("discord api warn");
      console.warn(msg);
    });
    /*this.on("debug", (msg) => {
      //this.logToChannel("Api Debug: `" + msg + "`");
      console.error("discord api debug");
      console.warn(msg);
    });*/
  }
  async load_message_handlers() {
    this.on("ready", () => {
      console.log("READY");
      this.logToChannel("**STARTED BOT!!!!**");
    });
    this.on("disconnect", () => {
      console.log("disconnect");
      this.logToChannel("**DISCONNECTED BOT!!!!**");
    });
    this.on("guildCreate", (guild) => {
      const msg = `guildCreate "${guild.name}"\nOwner: ${guild.owner?.displayName}\nMember count: ${guild.memberCount}\nID: ${guild.id}`;
      this.logToChannel(msg);
      console.log(msg);
    });
    this.on("guildDelete", (guild) => {
      const msg = `guildDelete "${guild.name}"\nOwner: ${guild.owner?.displayName}\nMember count: ${guild.memberCount}\nID: ${guild.id}`;
      this.logToChannel(msg);
      console.log(msg);
    });
  }

  async logToChannel(message: string | MessageEmbed) {
    if (this.fishy_options.info_channel_id) {
      const channel = await this.channels.fetch(this.fishy_options.info_channel_id);
      if (channel && channel.isText()) return channel.send(message);
    }
  }

  // Load command :)
  async load() {
    const options = this.fishy_options;
    if (!options.disable_discord_error_catching) await this.load_error_handler();
    if (options.info_channel_id) await this.load_message_handlers();

    if (!options.disable_db_connect) await this.load_db();

    if (options.event_array) {
      options.event_array.forEach((event) => {
        if (
          Object.keys(Constants.Events).includes(event.trigger.toUpperCase()) ||
          Object.values(Constants.Events)
            .map((v) => v.toLowerCase())
            .includes(event.trigger.toLowerCase())
        ) {
          this.on(event.trigger, event.run.bind(null, this));
        } else {
          // @ts-ignore
          this.ws.on(event.trigger, event.run.bind(null, this));
        }
      });
    }
    if (options.cmd_array) {
      options.cmd_array.forEach((new_command) => {
        new_command.config.category = new_command.config.category ?? "debug";
        if (
          this.categories.has(new_command.config.category) &&
          !this.categories.get(new_command.config.category)!.commands!.includes(new_command.config.name)
        ) {
          let old_category = this.categories.get(new_command.config.category)!;
          old_category.commands!.push(new_command.config.name);
          this.categories.set(new_command.config.category, old_category);
        }
        this.commands.set(new_command.config.name, new_command);
      });
    }

    await Promise.all([this.load_events(options.event_dir), this.load_commands(options.cmd_dir)]);
    if (!options.disable_help_command) {
      let help_cmd = await this.help_command();
      this.commands.set(help_cmd.config.name, help_cmd);
    }
    if (!options.disable_silence_mode) this.load_silence_command();
    if (!options.disable_commands_command) this.load_commands_command();

    if (!options.disable_interaction_load) await this.load_interactions();
    if (!options.disable_command_handler) await this.load_commandhandler();
  }
}

export function generateUsage(title: string, config: FishyApplicationCommand | FishyApplicationCommandOption): string {
  let str = `${title.trim()} `;
  if (
    !config.options?.find(
      (opt) =>
        opt.type === ApplicationCommandOptionType.SUB_COMMAND ||
        opt.type === ApplicationCommandOptionType.SUB_COMMAND_GROUP
    )
  ) {
    config.options?.forEach((opt) => {
      if (opt.required) {
        str += `<${opt.name}: ${Object.keys(ApplicationCommandOptionType)[
          Object.values(ApplicationCommandOptionType).indexOf(opt.type)
        ].toLowerCase()}> `;
      } else {
        str += `(${opt.name}: ${Object.keys(ApplicationCommandOptionType)[
          Object.values(ApplicationCommandOptionType).indexOf(opt.type)
        ].toLowerCase()}) `;
      }
    });
  } else {
    str +=
      "[" +
      config.options
        .map((opt: FishyApplicationCommandOption | ApplicationCommandOption) => {
          return `${opt.name}`;
        })
        .join("|") +
      "]";
  }
  return str;
}
