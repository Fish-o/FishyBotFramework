import { Schema, model } from "mongoose";

const GuildConfigSchema = new Schema({
  guild_id: Number,
});
export const GuildModel = model("GuildData", GuildConfigSchema);
