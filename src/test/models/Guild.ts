import { Schema, model } from "mongoose";

const GuildConfigSchema = new Schema({
  id: String,
  settings: Map,
  
});
export const GuildModel = model("guilds", GuildConfigSchema);
 