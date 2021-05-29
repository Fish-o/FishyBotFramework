# FishyBot Framework

A framework for creating complex discord bots easily.

<hr>

### How to use:

1. install the package with `npm install fishy-bot-framework -s`
2. import the package with iether `import * as FBF from "fishy-bot-framework"`
   or `const FBF = require("fishy-bot-framework")`
3. Start a new client:

```TypeScript
import * as FBF from "fishy-bot-framework"
const Client = new FBF.FishyClient({
  token:"discord bot token",
  author:"Your name",
  db_uri: "mongodb://myDBReader:D1fficultP%40ssw0rd@mongos0.example.com:27017",
  guild_model: GuildModel,
  cmd_dir: "./src/commands",

})
Client.login()
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

Commands can be stored like this

```
create - /commands/"category"/
create - /commands/"category"/index.js
export - "name" & "description" from /commands/"category"/index.js
create - /commands/"category"/command.js
```

Example:

![image](https://cdn.discordapp.com/attachments/739529254219284500/823534291233406987/unknown.png)

## Buttons!

To create a button you can run:

```TypeScript
interaction.send(
  "Message",{
    type: ComponentType.ActionRow,
    components: [
      {
        type: ComponentType.Button,
        label: "Kick",
        style: ComponentStyle.Danger,
        custom_id:
          `kick_${member.id}`,
      },
    ],
  },
)
```

To run code when this button is pressed, you can create a new file just like a normal command.
You can put this file anywhere you can place a normal command!

Put this code in the new file:

```TypeScript
export const run: FishyButtonCommandCode = async (client, interaction) => {
  const memberID = interaction.customID.slice(config.custom_id.length);
  const member = await interaction.guild.members.fetch(memberID)
  await member.kick()
  interaction.send("Kicked the member!");
};

export const config: FishyButtonCommandConfig = {
  custom_id: "kick_",
  atStart: true,
  user_perms: ["KICK_MEMBERS"]
  bot_needed: true,
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

```JavaScript
{
  id: String,     // The guild's id for fetching, index this
  settings: Object   // Used for disabeling commands
}
```
