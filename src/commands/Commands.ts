import { generateUsage } from "../client";
import { ApplicationCommandOptionType, FishyCommandCode, FishyCommandConfig } from "../types";

export const run: FishyCommandCode = async (client, interaction) => {
  function sortCatsOnKeys(dict: { [cat_name: string]: Array<{ name: string; usage: string }> }) {
    var sorted = [];
    for (var key in dict) {
      sorted[sorted.length] = key;
    }
    sorted.sort();

    var tempDict: { [cat_name: string]: Array<{ name: string; usage: string }> } = {};
    for (var i = 0; i < sorted.length; i++) {
      tempDict[sorted[i]] = dict[sorted[i]];
    }

    return tempDict;
  }

  let cats: { [cat_name: string]: Array<command> } = {};
  interface command {
    name: string;
    usage: string;
  }

  let index_string = `[0]: Index
[Index][0]`;
  let commands_string = ``;

  client.categories.forEach((category) => {
    if (category.name.toLowerCase() == "debug") return;
    if (category.commands?.[0]) {
      const commands: Array<command> = [];
      category.commands.forEach((cmd_name) => {
        const cmd = client.commands.get(cmd_name);
        let command: command;
        const interaction = cmd?.config.interaction_options;
        if (!cmd || !interaction) return commands.push({ name: `${cmd_name}`, usage: `${cmd_name}` });
        else if (
          interaction.options?.find(
            (opt) =>
              opt.type === ApplicationCommandOptionType.SUB_COMMAND ||
              opt.type === ApplicationCommandOptionType.SUB_COMMAND_GROUP
          )
        ) {
          let cmds: Array<command> = [];
          interaction.options.forEach((opt) => {
            if (opt.type === ApplicationCommandOptionType.SUB_COMMAND) {
              cmds.push({
                name: `${cmd_name} ${opt.name}`,
                usage: generateUsage(`${cmd_name} ${opt.name}`, opt),
              });
            } else if (opt.type === ApplicationCommandOptionType.SUB_COMMAND_GROUP && opt.options?.[0]) {
              opt.options.forEach((opt2) => {
                if (opt2.type === ApplicationCommandOptionType.SUB_COMMAND) {
                  cmds.push({
                    name: `${cmd_name} ${opt.name} ${opt2.name}`,
                    usage: generateUsage(`${cmd_name} ${opt.name} ${opt2.name}`, opt2),
                  });
                }
              });
            }
          });
          return commands.push(...cmds);
        } else {
          return commands.push({ name: `${cmd_name}`, usage: generateUsage(`${cmd_name}`, interaction) });
        }
      });
      if (cats[category.name]) cats[category.name].push(...commands);
      else cats[category.name] = commands;
    }
  });
  cats = sortCatsOnKeys(cats);

  Object.keys(cats).forEach((catname) => {
    cats[catname].sort();

    const index = Object.keys(cats).findIndex((key) => key == catname) + 1;

    index_string = index_string.concat("\n", `[${catname}][${index}]`);

    let cat_string = `\n\n[${index}]: ${catname}`;

    cats[catname].forEach((command) => {
      let command_string = `\n/${command.usage}`;
      cat_string = cat_string.concat(command_string);
    });

    commands_string = commands_string.concat(cat_string);
  });

  return interaction.send(`\`\`\`markdown
[FishyBot](https://github.com/Fish-o/FishyBotV2)\n/commandname subcommand <required> (optional)\n\n${index_string} ${commands_string}\`\`\``);
};

export const config: FishyCommandConfig = {
  name: "commands",
  bot_needed: false,
  interaction_options: {
    name: "commands",
    description: "Display all commands of the bot",
    options: [],
  },
};
