import { botFeatureService, botService } from "#services";
import { Client, Collection } from "discord.js";
import { intentsAll, findClientByToken, allowToFeatures, loadEvents, loadPrefixCommands, loadSlashCommands, eventExecuter, deploySlashCommands } from "#helpers";

const { addBot, getAllBots, getBotById } = botService
const { getFeaturesByBotId } = botFeatureService

export const botList = [];

const BotAdd = async (req, res) => {
  try {
    const { token, userId } = req.body;
    if (!token) {
      return res.status(400).json({ message: "Token zorunludur." });
    }

    const exists = await getAllBots();
	const isToken = findClientByToken(exists, token)
    if (isToken) return res.status(409).json({ message: "Bu bot zaten kayıtlı." });
    

    const botClient = new Client({ intents: intentsAll() });
    await botClient.login(token);

    const newBotData = {
      token,
      botId: botClient.user.id,
      username: botClient.user.username,
      user: userId
    };

    const newBot = await addBot(newBotData);
    await botClient.destroy();

    return res.status(201).json({ message: "Bot kaydedildi.", bot: newBot });
  } catch (err) {
    console.error("[bot controller - BotAdd]:", err);
    return res.status(500).json({ message: "Token geçersiz ya da bot bağlanamadı.", error: err.message });
  }
};

const GetBots = async (req, res) => {
  try {
    const bots = await getAllBots();
    return res.status(200).json(bots);
  } catch (err) {
    console.error("[bot controller - GetBots]:", err);
    return res.status(500).json({ message: "Botlar alınırken hata oluştu.", error: err.message });
  }
};

const BotStart = async (req, res) => {
  try {
    const { id } = req.params;
    const bot = await getBotById(id);
    
    if (!bot) return res.status(404).json({ message: "Bot bulunamadı." });

    if (findClientByToken(botList, bot.token)) {
      return res.status(200).json({ status: true, message: "Bot zaten çalışıyor." });
    }

    const client = new Client({ intents: intentsAll() });

    client.prefixCommands = new Collection()
    client.slashCommands = new Collection()

    const events = await loadEvents();
    const prefixCommands = await loadPrefixCommands();
    const slashCommands = await loadSlashCommands();

    const featureList = [...events, ...prefixCommands, ...slashCommands];
    const botFeatures = await getFeaturesByBotId(id);

    if (botFeatures.length === 0) return res.status(200).json({ status: true, message: "Lütfen özellik ekleyiniz." });

    const allowedFeatures = allowToFeatures(featureList, botFeatures?.features);

    const eventTypeControl = allowedFeatures.filter(af => af.type === 'event');
    const slashs = allowedFeatures.filter(af => af.type === 'slash');
    const prefixes = allowedFeatures.filter(af => af.type === 'prefix');


    // executers
    await eventExecuter(client, eventTypeControl, id);

    for (const commands1 of prefixes) {
      client.prefixCommands.set(commands1.name, commands1.execute);
    }

    for (const commands2 of slashs) {
      client.slashCommands.set(commands2.data.name, commands2.execute);
    }

    const sendSlashComamndsToApi = await deploySlashCommands(bot.token, bot.botId, slashs)
    if(sendSlashComamndsToApi.success) console.log("Slash komutları başarıyla yüklendi")


    await client.login(bot.token);

    botList.push({ id: id, token: bot.token, client });
    return res.status(200).json({ status: true, message: "Bot başlatıldı." });
  } catch (err) {
    console.error("[bot controller - BotStart]:", err);
    return res.status(500).json({ message: "Bot bağlanamadı.", error: err.message });
  }
};

const BotStop = async (req, res) => {
  try {
    const { id } = req.params;
    const bot = await getBotById(id);
    if (!bot) return res.status(404).json({ message: "Bot bulunamadı." });

    const index = botList.findIndex(b => b.token === bot.token);
    if (index === -1) return res.status(400).json({ message: "Bot zaten çalışmıyor." });

    await botList[index].client.destroy();
    botList.splice(index, 1);

    return res.status(200).json({ status: true, message: "Bot durduruldu." });
  } catch (err) {
    console.error("[bot controller - BotStop]:", err);
    return res.status(500).json({ status: false, message: "Bot durdurulamadı.", error: err.message });
  }
};

const updatePrefix = async (req, res) => {
  try {
    const { id } = req.params;
    const { prefix } = req.body;

    if (!prefix) {
      return res.status(400).json({ message: "Yeni prefix belirtilmelidir." });
    }

    const bot = await getBotById(id);
    if (!bot) return res.status(404).json({ message: "Bot bulunamadı." });

    bot.prefix = prefix;
    await bot.save();

    return res.status(200).json({ message: "Prefix güncellendi.", bot });
  } catch (err) {
    console.error("[bot controller - updatePrefix]:", err);
    return res.status(500).json({ message: "Prefix güncellenirken hata oluştu.", error: err.message });
  }
};

const updateBotInfo = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, token, prefix } = req.body;

    const bot = await getBotById(id);
    if (!bot) return res.status(404).json({ message: "Bot bulunamadı." });

    if (name) bot.username = name;
    if (token) bot.token = token;
    if (prefix) bot.prefix = prefix;
    await bot.save();

    return res.status(200).json({ message: "Bot güncellendi.", bot });
  } catch (err) {
    console.error("[bot controller - updateBotInfo]:", err);
    return res.status(500).json({ message: "Bot güncellenirken hata oluştu.", error: err.message });
  }
};

const BotIsStatusById = async (req, res) => {
  try {
    const { id } = req.params;
    const bot = botList.find((bl)=> bl.id === id)

    if(!bot) return res.status(200).json({ message: "Bot durumları çekildi", started: false });

    return res.status(200).json({ message: "Bot durumları çekildi", started: true });
  } catch (err) {
    console.error("[bot controller - BotIsStatusById]:", err);
    return res.status(500).json({ message: "Bot durumu çekilirken hata oluştu.", error: err.message });
  }
}

// reload function
const reloadAll = async (req, res) => {
  try {
    const { id } = req.params;
    const bot = await getBotById(id);
    if (!bot) return res.status(404).json({ message: "Bot bulunamadı." });

    const IClient = findClientByToken(botList, bot.token);
    IClient.client.prefixCommands.clear();
    IClient.client.slashCommands.clear();

    const events = await loadEvents();
    const prefixCommands = await loadPrefixCommands();
    const slashCommands = await loadSlashCommands();

    const featureList = [...events, ...prefixCommands, ...slashCommands];
    const botFeatures = await getFeaturesByBotId(id);

    if (botFeatures.length === 0) return res.status(200).json({ status: true, message: "Lütfen özellik ekleyiniz." });

    const allowedFeatures = allowToFeatures(featureList, botFeatures);

    const eventTypeControl = allowedFeatures.filter(af => af.type === 'event');


    // executers
    await eventExecuter(IClient.client, eventTypeControl, id);

    for (const commands1 of allowedFeatures) {
      if (commands1.type === 'prefix') {
        IClient.client.prefixCommands.set(commands1.name, commands1.execute);
      }
    }

    for (const commands2 of allowedFeatures) {
      if (commands2.type === 'slash') {
        IClient.client.slashCommands.set(commands2.data.name, commands2.execute);
      }
    }


    
    return res.status(200).json({ status: true, message: "Bot başlatıldı." });
  } catch (err) {
    console.error("[bot controller - BotStart]:", err);
    return res.status(500).json({ message: "Bot bağlanamadı.", error: err.message });
  }
};

const reloadPrefixCommands = async (req, res) => {
  try {
    const { id } = req.params;
    const bot = await getBotById(id);
    if (!bot) return res.status(404).json({ message: "Bot bulunamadı." });

    const IClient = findClientByToken(botList, bot.token);
    IClient.client.prefixCommands.clear();

    const prefixCommands = await loadPrefixCommands();
    const botFeatures = await getFeaturesByBotId(id);

    if (botFeatures.length === 0) return res.status(200).json({ status: true, message: "Lütfen özellik ekleyiniz." });

    const allowedFeatures = allowToFeatures(prefixCommands, botFeatures);
    const prefixTypeControl = allowedFeatures.filter(af => af.type === 'prefix');


    for (const command of prefixTypeControl) {
      IClient.client.prefixCommands.set(command.name, command.execute);
    }

    return res.status(200).json({ status: true, message: "Prefix komutları yeniden yüklendi." });
  } catch (err) {
    console.error("[bot controller - ReloadPrefixCommands]:", err);
    return res.status(500).json({ message: "Prefix komutları yeniden yüklenirken hata oluştu.", error: err.message });
  }
};

const reloadSlashCommands = async (req, res) => {
  try {
    const { id } = req.params;
    const bot = await getBotById(id);
    if (!bot) return res.status(404).json({ message: "Bot bulunamadı." });

    const IClient = findClientByToken(botList, bot.token);
    IClient.client.slashCommands.clear();

    const slashCommands = await loadSlashCommands();
    const botFeatures = await getFeaturesByBotId(id);

    if (botFeatures.length === 0) return res.status(200).json({ status: true, message: "Lütfen özellik ekleyiniz." });

    const allowedFeatures = allowToFeatures(slashCommands, botFeatures);
    const slashTypeControl = allowedFeatures.filter(af => af.type === 'slash');


    for (const command of slashTypeControl) {
      IClient.client.slashCommands.set(command.data.name, command.execute);
    }

    return res.status(200).json({ status: true, message: "Slash komutları yeniden yüklendi." });
  } catch (err) {
    console.error("[bot controller - ReloadSlashCommands]:", err);
    return res.status(500).json({ message: "Slash komutları yeniden yüklenirken hata oluştu.", error: err.message });
  }
};

const reloadEvents = async (req, res) => {
  try {
    const { id } = req.params;
    const bot = await getBotById(id);
    if (!bot) return res.status(404).json({ message: "Bot bulunamadı." });

    const IClient = findClientByToken(botList, bot.token);

    const events = await loadEvents();
    const botFeatures = await getFeaturesByBotId(id);

    if (botFeatures.length === 0) return res.status(200).json({ status: true, message: "Lütfen özellik ekleyiniz." });

    const allowedFeatures = allowToFeatures(events, botFeatures);
    const eventTypeControl = allowedFeatures.filter(af => af.type === 'event');

    await eventExecuter(IClient.client, eventTypeControl, id);

    return res.status(200).json({ status: true, message: "Eventler yeniden yüklendi." });
  } catch (err) {
    console.error("[bot controller - ReloadEvents]:", err);
    return res.status(500).json({ message: "Eventler yeniden yüklenirken hata oluştu.", error: err.message });
  }
};

const getBotByIdRoute = async (req, res) => {
  try {
    const { id } = req.params;
    const bot = await getBotById(id);
    if (!bot) return res.status(404).json({ message: "Bot bulunamadı." });
    return res.status(200).json({ status: true, data: bot });
  } catch (err) {
    console.error("[bot controller - GetBotById]:", err);
    return res.status(500).json({ message: "Bot bilgileri alınırken hata oluştu.", error: err.message });
  }
}

// bot config
const BotPresence = async (req, res) => {
  try {
    const { id } = req.params;
	const { status, presenceName, presenceType } = req.body;
    const bot = await getBotById(id);
    if (!bot) return res.status(404).json({ message: "Bot bulunamadı." });

    const index = botList.findIndex(b => b.token === bot.token);
 
    const iBot =  botList[index].client
	
	if(status) await iBot.user.setStatus(status)
	if(presenceName || presenceType) await iBot.user.setPresence({
		activities: [
            {
                name: presenceName,
                type: Number(presenceType)
            }
        ]
	})

    return res.status(200).json({ status: true, message: "Durum değiştirildi" });
  } catch (err) {
    console.error("[bot controller - BotPresence]:", err);
    return res.status(500).json({ status: false, message: "Durum değiştirilmedi", error: err.message });
  }
};

const BotServers = async (req, res) => {
  try {
    const { id } = req.params;
    const bot = await getBotById(id);
    if (!bot) return res.status(200).json({ status: false, message: "Bot bulunamadı." });

    const index = botList.findIndex(b => b.token === bot.token);
    if (index === -1 || !botList[index]?.client) {
      return res.status(200).json({ status: false, message: "Bot başlatılmamış!" });
    }

    const iBot = botList[index].client;
    if (!iBot.isReady()) {
      return res.status(200).json({ status: false, message: "Bot henüz hazır değil, lütfen bekleyin." });
    }

    let guildsCollection = iBot.guilds.cache;
    if (!guildsCollection || guildsCollection.size === 0) {
      try {
        guildsCollection = await iBot.guilds.fetch();
      } catch (fetchErr) {
        console.warn("[bot controller - BotServers]: guilds.fetch failed, using cache:", fetchErr.message);
      }
    }

    const servers = guildsCollection
      ? guildsCollection.map(guild => ({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          memberCount: guild.memberCount
        }))
      : [];

    return res.status(200).json({ status: true, message: "Sunucular çekildi", data: servers });
  } catch (err) {
    console.error("[bot controller - BotServers]:", err);
    return res.status(500).json({ status: false, message: "Sunucular çekilemedi", error: err.message });
  }
};

const GetBotData = async (req, res) => {
  try {
    const { id, guildId } = req.params;

    if (!guildId || guildId === 'undefined') {
      return res.status(200).json({ status: false, message: "Sunucu ID geçersiz." });
    }

    const bot = await getBotById(id);
    if (!bot) return res.status(200).json({ status: false, message: "Veri bulunamadı." });

    const index = botList.findIndex(b => b.token === bot.token);
    if (index === -1 || !botList[index]?.client) {
      return res.status(200).json({ status: false, message: "Bot başlatılmamış!" });
    }

    const iBot = botList[index].client;
    const server = await iBot.guilds.fetch(guildId).catch(() => null);

    if (!server) {
      return res.status(200).json({ status: false, message: "Sunucu bulunamadı." });
    }

    const rolesCache = await server.roles.fetch().catch(() => null);
    const channelsCache = await server.channels.fetch().catch(() => null);
    const membersCache = await server.members.fetch().catch(() => null);

    const roles = rolesCache
      ? rolesCache.map(role => ({
          id: role.id,
          name: role.name,
          color: role.color
        })).filter(r => r.name !== '@everyone')
      : [];

    const textBasedChannelTypes = [0, 5, 10, 11, 12, 15, 16];
    const channels = channelsCache
      ? channelsCache
        .filter(ch => {
          if (!textBasedChannelTypes.includes(ch.type)) return false;
          try {
            const perms = typeof ch.permissionsFor === 'function' ? ch.permissionsFor(iBot.user.id) : null;
            if (perms && !perms.has('SendMessages')) return false;
          } catch (e) {
          }
          return true;
        })
        .map(channel => ({
          id: channel.id,
          name: channel.name,
          type: channel.type
        }))
      : [];

    const members = membersCache
      ? membersCache.map(member => ({
          userId: member.user.id,
          displayName: member.displayName || member.user.username,
          userTag: member.user.tag
        }))
      : [];

    const data = { roles, channels, members };

    return res.status(200).json({ status: true, message: "Veriler çekildi", data: data });

  } catch (err) {
    console.error("[bot controller - GetBotData]:", err);
    return res.status(500).json({ status: false, message: "Veriler çekilemedi", error: err.message });
  }
};



export {
	BotAdd,
	GetBots,
	BotStart,
	BotStop,

	getBotByIdRoute,

	updateBotInfo,

	updatePrefix,
	BotIsStatusById,

	reloadAll,

	reloadEvents,
	reloadPrefixCommands,
	reloadSlashCommands,
	
	BotPresence,
	BotServers,
  GetBotData

}