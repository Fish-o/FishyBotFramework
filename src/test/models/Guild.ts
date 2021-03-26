import { Schema, model } from "mongoose";

const GuildConfigSchema = new Schema({
  id: { type: String, required: true },
  settings: { type: Map, required: true, default: new Map() },
});
export const GuildModel = model("guilds", GuildConfigSchema);
