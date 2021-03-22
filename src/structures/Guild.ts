const { Structures } = require("discord.js");
class Guild extends Structures.get("Guild") {
  async fetch_db_guild(options?:{ignore_cache?: boolean}){
    if(options?.ignore_cache){
      
    }
  }
}
Structures.extend("Guild", () => Guild);
