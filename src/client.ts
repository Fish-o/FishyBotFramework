import { Client, ClientOptions, Collection, Constants } from "discord.js";
import {
  ApplicationCommand,
  ApplicationCommandOption,
  CommandCategory,
  FishyClientOptions,
  FishyCommand,
  FishyEvent,
  raw_interaction,
  user_object,
} from "./types";
import * as fs from "fs";
import { join } from "path";
import { Interaction } from "./structures/Interaction";
import axios from "axios";
import { ApplicationCommandCompare } from "./utils/ApplicationCommandCompare";
import { ErrorEmbed } from "./utils/Embeds";

// The main client!
export class FishyClient extends Client {
  fishy_options: FishyClientOptions;
  commands: Collection<string, FishyCommand>;
  categories: Collection<string, CommandCategory>;

  constructor(options: FishyClientOptions, client_options?: ClientOptions) {
    super(client_options);
    this.commands = new Collection();
    this.categories = new Collection();
    this.fishy_options = options;

    // Checking for things
    if (!options.token) throw Error("You must specify a token");
    else this.token = options.token;
    //if (!options.event_array && !options.event_dir) throw Error("You must specify an event directory or event array");
    if (!options.cmd_array && !options.cmd_dir) throw Error("You must specify a command directory or command array");

    //Loading commands and events'
    if (!options.disable_load_on_construct) this.load();
    if (!options.disable_command_handler) this.load_commandhandler();
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
            let index_path = files.find((file) => file.startsWith("index."));
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
              if ((file.endsWith(".js") || file.endsWith(".ts")) && !file.startsWith("index.")) {
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
    await this.load_interactions();
  }
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
      try {
        await command.run(this, interaction);
      } catch (err) {
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
}
