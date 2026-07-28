import Message from '../libs/Message.js';
import { botList } from './botController.js';

import { botService } from "#services";
const { getBotById } = botService


const CreateMessage = async(req, res) => {
    const { botId } = req.params;
    const { userId, messageId, serverId, channelId, content, type, genre } = req.body;
    try {

        if (!type || !genre) {
            return res.status(400).json({
                status: false,
                message: 'Tür ve gönderim türü zorunludur.'
            });
        }

        if (type !== 'send' && type !== 'reply') {
            return res.status(400).json({
                status: false,
                message: 'Geçersiz işlem türü.'
            });
        }

        if (genre !== 'dm' && genre !== 'guild') {
            return res.status(400).json({
                status: false,
                message: 'Geçersiz hedef türü.'
            });
        }

        if (!content) {
            return res.status(400).json({
                status: false,
                message: 'Mesaj içeriği zorunludur.'
            });
        }

        if (genre === 'guild' && (!serverId || !channelId)) {
            return res.status(400).json({
                status: false,
                message: 'Sunucu mesajı için sunucu ve kanal zorunludur.'
            });
        }

        if (genre === 'dm' && !userId) {
            return res.status(400).json({
                status: false,
                message: 'DM için kullanıcı zorunludur.'
            });
        }

        if (type === 'reply' && !messageId) {
            return res.status(400).json({
                status: false,
                message: 'Yanıt için mesaj ID zorunludur.'
            });
        }

        const bot = await getBotById(botId);
        if (!bot) return res.status(404).json({ status: false, message: "Bot bulunamadı." });

        const index = botList.findIndex(b => b.token === bot.token);
        if (index === -1 || !botList[index]?.client) {
            return res.status(400).json({ status: false, message: "Bot çalışmıyor." });
        }

        const client = botList[index].client

        const message = new Message(client, {
            userId: userId,
            serverId: serverId,
            messageId: messageId,
            channelId: channelId,
            content: content
        });

        let result;
        switch (type) {
            case 'send':
                result = await message.send(genre)
                break
            case 'reply':
                result = await message.reply(genre)
                break
            default:
                return res.status(400).json({
                    status: false,
                    message: 'Geçersiz işlem türü.'
                });
        }

        if (!result?.success) {
            return res.status(400).json({
                status: false,
                message: 'Mesaj gönderilemedi. Hedef bilgilerini kontrol edin.'
            });
        }

        return res.status(200).json({
            status: true,
            message: 'Mesaj işlemi başarılı.'
        });
    } catch (error) {
        console.error("[message controller - CreateMessage]:", error);
        return res.status(500).json({
            status: false,
            message: 'Mesaj işlemi başarısız.',
            error: error.message
        });
    }
}

const GetMessages = async(req, res) => {
    const { botId } = req.params;
    const { userId, serverId, channelId, type } = req.body;
    try {

        if (!type) {
            return res.status(400).json({
                status: false,
                message: 'Mesaj türü zorunludur.'
            });
        }

        if (type !== 'dm' && type !== 'guild') {
            return res.status(400).json({
                status: false,
                message: 'Geçersiz mesaj türü.'
            });
        }

        if (type === 'guild' && (!serverId || !channelId)) {
            return res.status(400).json({
                status: false,
                message: 'Sunucu mesajları için sunucu ve kanal zorunludur.'
            });
        }

        if (type === 'dm' && !userId) {
            return res.status(400).json({
                status: false,
                message: 'DM mesajları için kullanıcı zorunludur.'
            });
        }

        const bot = await getBotById(botId);
        if (!bot) return res.status(404).json({ status: false, message: "Bot bulunamadı." });

        const index = botList.findIndex(b => b.token === bot.token);
        if (index === -1 || !botList[index]?.client) {
            return res.status(400).json({ status: false, message: "Bot çalışmıyor." });
        }

        const client = botList[index].client
        const message = new Message(client, {
            userId: userId,
            serverId: serverId,
            channelId: channelId
        });
        const result = await message.getMessages(type);

        if (!result?.success || !result?.messages) {
            return res.status(400).json({
                status: false,
                message: 'Mesajlar alınamadı. Bilgileri kontrol edin.'
            });
        }

        const messagesPlain = result.messages.map(msg => ({
            id: msg.id,
            content: msg.content,
            author: {
                id: msg.author?.id,
                username: msg.author?.username,
                tag: msg.author?.tag
            },
            createdAt: msg.createdAt,
            channelId: msg.channelId,
            guildId: msg.guildId
        }));

        return res.status(200).json({
            status: true,
            message: 'Mesajlar başarıyla alındı.',
            data: { messages: messagesPlain }
        });
    } catch (error) {
        console.error("[message controller - GetMessages]:", error);
        return res.status(500).json({
            status: false,
            message: 'Mesajlar alınırken hata oluştu.',
            error: error.message
        });
    }
}

export { 
    CreateMessage, 
    GetMessages
};