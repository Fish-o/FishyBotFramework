import { Client, ClientOptions, Collection, Constants } from "discord.js";
import { CommandCategory, FishyClientOptions, FishyCommand, FishyEvent } from "./types";
import * as fs from "fs";
const discordEvents = Constants.Events;
import { join } from "path";
import { Interaction } from "./extensions/Interaction";

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
  async load_commands(directory?: string) {
    return new Promise(async (resolve, reject) => {
      if (directory) {
        try {
          const dirs = await fs.promises.readdir(directory);
          console.log(dirs);
          dirs.forEach(async (dir, dir_index, dir_array) => {
            const category_path = join(directory!, dir);

            let files = await fs.promises.readdir(category_path);
            console.log(files);
            if (!files) return;
            let index_path = files.find((file) => file.startsWith("index."));
            let category: CommandCategory | undefined = undefined;
            if (index_path) {
              category = require(join(process.cwd(), category_path, index_path));
              if (category) {
                category.commands = category.commands ?? [];
                this.categories.set(category.name, category);
              }
            }
            files.forEach((file, file_index, file_array) => {
              if ((file.endsWith(".js") || file.endsWith(".ts")) && !file.startsWith("index.")) {
                let command_path: string = join(process.cwd(), category_path, file);
                let new_command: FishyCommand = require(command_path);
                if (!new_command.config.category) {
                  new_command.config.category = dir;
                }
                if (
                  this.categories.has(new_command.config.category) &&
                  !this.categories.get(new_command.config.category)!.commands!.includes(new_command.config.name)
                ) {
                  let old_category = this.categories.get(new_command.config.category)!;
                  old_category.commands!.push(new_command.config.name);
                  this.categories.set(new_command.config.category, old_category);
                }
                this.commands.set(new_command.config.name, new_command);
              }
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
  }
  async load_commandhandler() {
    // @ts-ignore
    this.ws.on("INTERACTION_CREATE", (raw_interaction) => {
      let interaction = new Interaction(this, raw_interaction);
      interaction.send("YOOO");
    });
  }
}
