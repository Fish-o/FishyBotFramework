import { Collection } from "discord.js";
import { Model } from "mongoose";
import { FishyClient } from "..";

const db_guild_cache: Collection<string, { timestamp: number; data: any }> = new Collection();
const ttl = 5 * 60 * 1000;
const refresh_time = 20 * 1000;
export interface db_fetch_options {
  force?: boolean;
  disable_upsert?: boolean;
}

async function refresh(
  client: FishyClient,
  guild_id: string,
  options?: db_fetch_options,
  count?: number
): Promise<{ timestamp: number; data: any }> {
  let db_res = await client.GuildModel.findOne({ id: guild_id });
  if (!db_res) {
    if (!client.fishy_options.disable_db_default_upsert && !options?.disable_upsert && count !== 1) {
      const new_model = new client.GuildModel({ id: guild_id });
      await new_model.save();
      return await refresh(client, guild_id, options, (count = 1));
    } else {
      throw Error(`Could not find the database document of "${guild_id}"`);
    }
  }
  let answer = { timestamp: Date.now(), data: db_res };
  db_guild_cache.set(guild_id, answer);
  return answer.data;
}

export function fetch(client: FishyClient, guild_id: string, options?: db_fetch_options): Promise<any | undefined> {
  return new Promise(async (resolve, reject) => {
    if (!guild_id) {
      return;
    }
    if (!db_guild_cache.has(guild_id) || db_guild_cache.get(guild_id)!.timestamp + ttl < Date.now())
      return resolve(await refresh(client, guild_id, options));
    else if (db_guild_cache.get(guild_id)!.timestamp + refresh_time < Date.now()) {
      resolve(db_guild_cache.get(guild_id));
      return await refresh(client, guild_id, options);
    } else {
      return resolve(db_guild_cache.get(guild_id));
    }
  });
}

export async function update(client: FishyClient, guild_id: string, model: any) {
  let res = await client.GuildModel.updateOne({ id: guild_id }, model, { new: true });
  db_guild_cache.set(guild_id, { timestamp: Date.now(), data: res });
  return res;
}
