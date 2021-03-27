import { Client, ClientOptions, Collection, Constants, MessageEmbed } from "discord.js";
import {
  ApplicationCommand,
  ApplicationCommandOption,
  ApplicationCommandOptionChoice,
  ApplicationCommandOptionType,
  CommandCategory,
  FishyClientOptions,
  FishyCommand,
  FishyEvent,
  permission_overwritesType,
  raw_interaction,
  user_object,
} from "./types";
import * as fs from "fs";
import { join } from "path";
import { Interaction } from "./structures/Interaction";
import axios from "axios";
import { ApplicationCommandCompare } from "./utils/ApplicationCommandCompare";
import { ErrorEmbed } from "./utils/Embeds";
import { help } from "./test/commands/info/ping";
import mongoose, { Model } from "mongoose";

// The main client!
export class FishyClient extends Client {
  fishy_options: FishyClientOptions;
  GuildModel: Model<any, any>;
  commands: Collection<string, FishyCommand>;
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
  }

  // Loads the events from a given event_dir
  async load_events(directory?: string) {
    return new Promise((resolve, reject) => {
      if (directory) {
        fs.readdir(directory, (err, files) => {
          if (err) return;
          files.forEach((file, index, array) => {
            const event: FishyEvent = require(`${directory}/${file}`);
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
          const dirs = await fs.promises.readdir(directory);

          // Go through all the subdirecoties (categories)
          dirs.forEach(async (dir, dir_index, dir_array) => {
            const category_path = join(directory!, dir);

            let files = await fs.promises.readdir(category_path);
            console.log(files);
            if (!files) return;
            // Find a the index file for a category
            // That file says what the category does and that kind of stuff
            let index_path = files.find((file) => file.startsWith("index.") && !file.endsWith(".d.ts"));
            let category: CommandCategory | undefined = undefined;
            // Create a anew category if an index file was found
            if (index_path) {
              category = require(join(process.cwd(), category_path, index_path));
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
                let command_path: string = join(process.cwd(), category_path, file);
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
                this.commands.set(new_command.config.name, new_command);
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

    const SlashCommandsUrl = `https://discord.com/api/v8/applications/${user_id}/commands`;
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
      botSlashCommands.forEach((botSlashCommand) => {
        let discord_command = discordSlashCommands.find((cmd) => cmd.name == botSlashCommand.name);
        if (!discord_command)
          return axios
            .post(`https://discord.com/api/v8/applications/${user_id}/commands`, botSlashCommand, {
              headers: { Authorization: `Bot ${this.token}` },
            })
            .then((res) => console.log(`POST - ${res.status} Interaction: "${botSlashCommand.name}", `))
            .catch((err) => {
              console.log(err.response.config);
              console.log(err.response.status);
            });
        discord_done.push(discord_command.id!);
        if (!ApplicationCommandCompare(botSlashCommand, discord_command))
          return axios
            .patch(
              `https://discord.com/api/v8/applications/${user_id}/commands/${discord_command.id}`,
              botSlashCommand,
              {
                headers: { Authorization: `Bot ${this.token}` },
              }
            )
            .then((res) => console.log(`PATCH - ${res.status} Interaction: "${botSlashCommand.name}", `))
            .catch((err) => {
              console.log(err.response.config);
              console.log(err.response.status);
            });
      });
      discordSlashCommands.forEach((cmd) => {
        if (!discord_done.includes(cmd.id!)) {
          axios
            .delete(`https://discord.com/api/v8/applications/${user_id}/commands/${cmd.id}`, {
              headers: { Authorization: `Bot ${this.token}` },
            })
            .then((res) => console.log(`DELETE - ${res.status} Interaction: "${cmd.name}", `))
            .catch((err) => {
              console.log(err.response.config);
              console.log(err.response.status);
            });
        }
      });
    }
  }
  // Load the interaction command handler
  async load_commandhandler() {
    // @ts-ignore
    this.ws.on("INTERACTION_CREATE", async (raw_interaction) => {
      let interaction = new Interaction(this, raw_interaction);
      let command = this.commands.get(interaction.name);
      if (!command) {
        return interaction.sendSilent(
          `This interaction doesn't seem to exist, if you think this is a mistake, please contact ${this.fishy_options.author}`
        );
      }
      if (command.config.bot_needed === true) {
        if (!interaction.guild) {
          return interaction.sendSilent(`To use this command add the bot to this server`);
        }
      }
      if(command.config.bot_perms?.[0]){
        let failed = false;
        command.config.bot_perms.forEach(perm=>{
          if(!interaction.guild!.me?.hasPermission(perm)){
            failed = true;
          };
        }) 
        if(failed){
          return interaction.sendSilent(`The bot doesnt have the required permissions to run this command\nPermissions needed: \`${command.config.bot_perms.join(', ')}\``)
        }
      }

      if(command.config.user_perms?.[0]){
        let failed = false;
        command.config.user_perms.forEach(perm=>{
          if(interaction.member!.hasPermission(perm)){
            failed = true;
          };
        }) 
        if(failed){
          return interaction.sendSilent(`You do not have the required permissions to run this command.\nPermissions required: \`${command.config.user_perms.join(', ')}\``)
        }
      }

      try {
        await command.run(this, interaction);
      } catch (err) {
        console.error(err);
        let msg = `An error seems to have occured in the command: "${interaction.name}: \n\`\`\`${err}\`\`\``;
        let embed = new ErrorEmbed(
          `An error seems to have occured in the command: "${interaction.name}"`,
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
    let cmd: FishyCommand = {
      config: {
        bot_needed: false,
        name: "help",
        interaction_options: {
          name: "help",
          description: "View info about the bot commands and categories",
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
                console.log("in category");
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
      help: {
        description: "Usefull for getting help about a category or command or the whole bot",
        usage: "/help category info | /help command ping",
      },
      run: async (client, interaction) => {
        let cmd_help = (cmd_name: string): MessageEmbed => {
          let cmd = this.commands.get(cmd_name);
          if (!cmd) {
            cmd = this.commands.get(cmd_name.toLowerCase());
            if (!cmd) {
              cmd = this.commands.get(
                this.commands.keyArray()[
                  this.commands
                    .keyArray()
                    .map((key) => key.toLowerCase())
                    .indexOf(cmd_name.toLowerCase())
                ]
              );
              if (!cmd) {
                return new ErrorEmbed("No command found");
              }
            }
          }
          if (cmd.help.help_embed) return cmd.help.help_embed;
          let embed = new MessageEmbed().setAuthor(
            this.user!.tag,
            this.user!.displayAvatarURL(),
            `https://discord.com/oauth2/authorize?client_id=${
              this.user!.id
            }&permissions=8&scope=bot%20applications.commands`
          );
          if (cmd.help.color) embed.setColor(cmd.help.color);
          else embed.setColor(this.categories.get(cmd.config.category || "")?.help_embed_color || "RANDOM");
          if (cmd.help.title) embed.setTitle(cmd.help.title);
          else embed.setTitle(`${cmd.config.name} - Command Help`);
          embed.setDescription(`${cmd.help.description}
Usage: \`${cmd.help.usage}\`
User required perms: \`${cmd.config.user_perms?.join(", ") || "None"}\`
Bot user needed: \`${cmd.config.bot_needed}\`
`);

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
      return `**${command_name}** \`${cmd.help.description}\``;
    }
    return `**${command_name}**`;
  })
  ?.join("\n")}
`);
          return embed;
        };
        console.log(interaction.args);
        if (interaction.args.find((arg) => arg.name == "category")) {
          let cat_arg = interaction.args.find((arg) => arg.name == "category");
          if (cat_arg?.options?.[0]) {
            if (cat_arg.options[0].options?.[0].value?.startsWith("cmd_")) {
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
        } else if (interaction.args.find((arg) => arg.name == "command")?.options?.[0]?.name === "name") {
          let cmd_name = interaction.args.find((arg) => arg.name == "command")!.options![0].value;
          if (!cmd_name) {
            return interaction.send(new ErrorEmbed(`Command "${cmd_name}" not found`));
          }
          interaction.send(cmd_help(cmd_name));
        } else {
        }
      },
    };
    console.log(cmd);
    return cmd;
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
  // Load command :)
  async load() {
    const options = this.fishy_options;
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

    if (!options.disable_interaction_load) await this.load_interactions();
    if (!options.disable_command_handler) await this.load_commandhandler();
    if (!options.disable_db_connect) await this.load_db();
  }
}
