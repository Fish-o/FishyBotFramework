# FishyBot Framework

A framework for creating complex discord bots easily.

<hr>

### How to use:

1. install the package with `npm install fishy-bot-framework -s`
2. import the package with either `import * as FBF from "fishy-bot-framework"`
   or `const FBF = require("fishy-bot-framework")`
3. Start a new client:

```TypeScript
import * as FBF from "fishy-bot-framework"
const client = new FBF.FishyClient({
  token:"discord bot token",
  author:"Your name",
  db_uri: "mongodb://myDBReader:D1fficultP%40ssw0rd@mongos0.example.com:27017",
  guild_model: GuildModel,
  cmd_dir: "dist/commands",
})
client.login()
```

### Commands:

A basic command should look something like this

```TypeScript
// The code that gets run when the command gets called;
// It takes the arguments `FishyClient` and `Interaction`
export const run: FishyCommandCode = async (client, interaction) => {
  interaction.send(`Current websocket ping: \`${client.ws.ping}ms\``);
};

// The configuration of the commands, it needs this to run
export const config: FishyCommandConfig = {
  name: "ping",               // Name of the command
  bot_needed: false,          // If the bot user is required to be in the guild
                              // Needed for `Interaction.channel.send()` for example
  user_perms: [],             // An array of permissions the user needs to run the command
  interaction_options: {      // Discord interaction options
                              // https://discord.com/developers/docs/interactions/slash-commands#create-global-application-command-json-params
    name: "ping",
    description: "Ping the bot"
  },
};

```

Use these steps to create a new category

```
create - /commands/"category"/
create - /commands/"category"/index.ts
export - "name" & "description" from /commands/"category"/index.ts
create - /commands/"category"/command.ts
```

Example:

![image](https://cdn.discordapp.com/attachments/739529254219284500/823534291233406987/unknown.png)

## Buttons!

To create a button you can run:

```TypeScript
interaction.send("Message", {
  components: [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Button,
          style: ComponentStyle.Success,
          label: "HEY",
          custom_id: "send_ping",
        },
      ],
    },
  ],
});
```

To run code when this button is pressed, you can create a new file just like a normal command.
You can put this file anywhere you can place a normal command.

Put this code in the new file:

```TypeScript
export const run: FishyComponentCommandCode = async (client, interaction) => {
  if (interaction instanceof ButtonInteraction) {
    const memberID = interaction.data.custom_id.slice(config.custom_id.length);
    const member = await interaction.guild?.members.fetch(memberID);
    await member?.kick();
    interaction.send("Kicked the member!");
  }
};

export const config: FishyComponentCommandConfig = {
  custom_id: "kick_",
  atStart: true,
  bot_needed: true,
  user_perms: ["KICK_MEMBERS"],
};

```

## Select menus

To send a select menu, just like a button, you need to send message components

```TypeScript
interaction.send("oi", {
  components: [
    {
      type: ComponentType.ActionRow,
      components: [
        {
          type: ComponentType.Select,
          custom_id: "selectOption",
          options: [
            {
              label:"Option 1", value:"1",
              label:"Option 2", value:"2",
              label:"Option 3", value:"3",
              label:"Option 4", value:"4",
              label:"Option 5", value:"5",
            }
          ],
          max_values: 3,
          min_values: 1,
        },
      ],
    },
  ],
})
```

Then to do something with them

```TypeScript
export const run: FishyComponentCommandCode = async (client, interaction) => {
  if (interaction instanceof SelectInteraction) {
    interaction.sendSilent(`You have selected: \`${interaction.data.values.join(", ")}\``);
  }
};

export const config: FishyComponentCommandConfig = {
  custom_id: "selectOption",
};
```

## Events

A basic event file should look something like this:

```TypeScript
export const trigger: WSEventType | string = "INTERACTION_CREATE";
export async function run(client, data){

};
```

## Database

Required Mongoose data fields:

```TypeScript
{
  id: String,     // The guild's id for fetching, index this
  settings: Object   // Used for disabeling commands
}
```
