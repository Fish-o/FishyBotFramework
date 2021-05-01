import { MessageEmbed } from "discord.js";

// Basic error embed
export class ErrorEmbed extends MessageEmbed {
  constructor(title?: string, description?: string) {
    super();
    this.setColor("RED");
    this.setTimestamp();
    if (title) {
      this.setTitle(title);
    }
    if (description) {
      this.setDescription(description);
    }
  }
}

// Basic warning embed
export class WarnEmbed extends MessageEmbed {
  constructor(title?: string, description?: string) {
    super();
    this.setColor("ORANGE");
    this.setTimestamp();
    if (title) {
      this.setTitle(title);
    }
    if (description) {
      this.setDescription(description);
    }
  }
}
