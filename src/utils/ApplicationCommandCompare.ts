import {
  ApplicationCommand,
  ApplicationCommandOption,
  FishyApplicationCommand,
  FishyApplicationCommandOption,
} from "../types";

// Shit load of code used for comparing an interaction from discord, to one in the code.
// Can be used to check if a updated

// TODO: Improve this
export function ApplicationCommandCompare(
  discord_interaction: ApplicationCommand,
  interaction: ApplicationCommand
): boolean {
  function interaction_options_equality(
    discord_options: Array<ApplicationCommandOption>,
    interaction_options: Array<ApplicationCommandOption>
  ) {
    let done: Array<string> = [];
    let failed: boolean = false;
    interaction_options.forEach((interaction_option) => {
      if (failed) return;
      if (!discord_options.find((option) => option.name === interaction_option.name)) {
        failed = true;
        return;
      }
      let discord_option = discord_options.find((option) => option.name === interaction_option.name)!;
      if (
        discord_option.name == interaction_option.name &&
        discord_option.description.trim().toLowerCase() == interaction_option.description.trim().toLowerCase() &&
        discord_option.type == interaction_option.type &&
        (discord_option.required ?? false) == (interaction_option.required ?? false) &&
        discord_option.choices?.length == interaction_option.choices?.length &&
        discord_option.options?.length == interaction_option.options?.length
      ) {
        if (!discord_option.choices?.[0] && !interaction_option.choices?.[0]) {
        } else if (!discord_option.choices?.[0] || !interaction_option.choices?.[0]) {
          return (failed = true);
        } else {
          discord_option.choices.forEach((discord_choice) => {
            if (failed) return;
            let other_choice = interaction_option.choices!.find(
              (opt) => opt.name == discord_choice.name && opt.value == discord_choice.value
            );
            if (!other_choice) {
              return (failed = true);
            }
          });
          if (failed) return;
          interaction_option.choices.forEach((discord_choice) => {
            if (failed) return;
            let other_choice = discord_option.choices!.find(
              (opt) => opt.name == discord_choice.name && opt.value == discord_choice.value
            );
            if (!other_choice) {
              return (failed = true);
            }
          });
          if (failed) return;
        }

        if (!discord_option.options?.[0] && !interaction_option.options?.[0]) {
        } else if (!discord_option.options?.[0] || !interaction_option.options?.[0]) {
          return (failed = true);
        } else {
          if (
            !interaction_options_equality(discord_option.options, interaction_option.options) ||
            !interaction_options_equality(interaction_option.options, discord_option.options)
          ) {
            return (failed = true);
          }
        }
      } else {
        return (failed = true);
      }
    });

    return !failed;
  }
  if (!discord_interaction || !interaction) {
    return false;
  } else if (
    discord_interaction.name == interaction.name &&
    discord_interaction.description == interaction.description
  ) {
    if (!discord_interaction.options?.[0] && !interaction.options?.[0]) {
      return true;
    } else if (!discord_interaction.options?.[0] || !interaction.options?.[0]) {
      return false;
    } else {
      if (
        !interaction_options_equality(discord_interaction.options, interaction.options) ||
        !interaction_options_equality(interaction.options, discord_interaction.options)
      ) {
        return false;
      }
    }
  } else {
    return false;
  }
  return true;
}

export function ApplicationCommandBuild(command: FishyApplicationCommand): ApplicationCommand {
  function add_options(options: FishyApplicationCommandOption): ApplicationCommandOption {
    const new_option: ApplicationCommandOption = {
      name: options.name,
      description: options.description,
      type: options.type,
      required: options.required ?? false,
    };
    if (options.choices) new_option.choices = options.choices;
    if (options.options) new_option.options = options.options.map((opt) => add_options(opt));
    return new_option;
  }
  const data: ApplicationCommand = {
    name: command.name,
    description: command.description,
  };
  if (command.options) data.options = command.options.map((opt) => add_options(opt));
  return data;
}
