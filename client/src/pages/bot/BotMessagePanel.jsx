import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Box, Group, Highlight, Flex, Badge } from '@chakra-ui/react'
import { BiLeftArrowAltIcon } from "@icons";

import { messageAPI, botAPI } from '@requests'
import { TextUI, InputAndTextUI, ButtonUI, SelectUI } from '@ui'

import { showToast } from "@partials"

export default function BotMessagePanel() {
	const { botId } = useParams();
	const navigate = useNavigate()
	
	const [botDetail, setBotDetail] = useState(null);
    const [botStatus, setBotStatus] = useState(false);
    const [servers, setServers] = useState([]);
    const [channels, setChannels] = useState([]);
    const [users, setUsers] = useState([]);
    const [messageData, setMessageData] = useState([]);
	const [message, setMessage] = useState({
		text: '',
		server: [],
		channel: [],
        user: '',
        msg: [],
        type: [],
        genre: []
	});
	
	const fetchBotDetails = async (id) => {
        try {
            const response = await botAPI.getBotById(id);
            setBotDetail(response.data);
        } catch (error) {
            console.error("Error fetching bot details:", error);
        }
    }

    const fetchBotStatus = async (id) => {
        try {
            const response = await botAPI.botIsStatusById(id);
            setBotStatus(response?.started ?? false);
        } catch (error) {
            console.error("Error fetching bot status:", error);
            setBotStatus(false);
        }
    }
	
	async function handleSubmit(){
        const actionType = message.genre[0];
        const targetType = message.type[0];

        if (!actionType || !targetType) {
            showToast({
                message: 'Lütfen tür ve gönderim türünü seçin.',
                type: 'error',
                id: 'bot-message-panel',
                duration: 3000
            });
            return;
        }

        if (targetType === 'guild' && (!message.server[0] || !message.channel[0])) {
            showToast({
                message: 'Lütfen sunucu ve kanal seçin.',
                type: 'error',
                id: 'bot-message-panel',
                duration: 3000
            });
            return;
        }

        if (targetType === 'dm' && !message.user) {
            showToast({
                message: 'Lütfen kullanıcı ID\'sini girin.',
                type: 'error',
                id: 'bot-message-panel',
                duration: 3000
            });
            return;
        }

        if (actionType === 'reply' && !message.msg[0]) {
            showToast({
                message: 'Lütfen yanıtlanacak mesajı seçin.',
                type: 'error',
                id: 'bot-message-panel',
                duration: 3000
            });
            return;
        }

        if (!message.text) {
            showToast({
                message: 'Lütfen mesaj içeriğini girin.',
                type: 'error',
                id: 'bot-message-panel',
                duration: 3000
            });
            return;
        }

		const result = await messageAPI.createMessage(botId,{
			content: message.text,
			serverId: message.server[0],
			channelId: message.channel[0],
            userId: message.user,
            type: actionType,
            genre: targetType,
            messageId: message.msg[0]
        })
		
		if(!result?.status){
			showToast({
				message: `${result?.message || result?.error}`,
				type: 'error',
				id: 'bot-message-panel',
				duration: 3000
			})
            return;
		}
		
		showToast({
            message: `${result?.message}`,
            type: 'success',
            id: 'bot-message-panel',
            duration: 3000
        });
		
	}
	
    async function fetchData(){
        try {
            const result = await botAPI.servers(botId);
            if (!result?.status) return;

            const serversData = result?.data?.map((server) => ({
                label: server.name,
                value: server.id
            })) || [];

            setServers(serversData)
        } catch (error) {
            console.error("Error fetching servers:", error);
        }
    }

    async function getServerData(){
        const guildId = message?.server[0];
        if (!guildId) {
            setChannels([]);
            setUsers([]);
            return;
        }

        try {
            const result = await botAPI.getBotData(botId, guildId);
            if (!result?.status) return;

            const serverChannelData = result?.data?.channels?.map((channel) => ({
                label: channel.name,
                value: channel.id
            })) || [];

            setChannels(serverChannelData)

            const serverUserData = result?.data?.members?.map((member) => ({
                label: member.displayName,
                value: member.userId
            })) || [];

            setUsers(serverUserData)
        } catch (error) {
            console.error("Error fetching server data:", error);
            setChannels([]);
            setUsers([]);
        }
    }

    async function getMessagesData(){
        const targetType = message?.type[0];
        if (!targetType) {
            setMessageData([]);
            return;
        }

        if (targetType === 'guild' && (!message?.server[0] || !message?.channel[0])) {
            setMessageData([]);
            return;
        }

        if (targetType === 'dm' && !message?.user) {
            setMessageData([]);
            return;
        }

        try {
            const result = await messageAPI.getMessages(botId,{
                userId: message?.user,
                serverId: message?.server[0],
                channelId: message?.channel[0],
                type: targetType
            });

            if (!result?.status) {
                setMessageData([]);
                return;
            }

            const targetMessageData = result?.data?.messages?.map((msg) => ({
                label: msg.content ? msg.content.substring(0, 50) + (msg.content.length > 50 ? '...' : '') : '(içerik yok)',
                value: msg.id
            })) || [];

            setMessageData(targetMessageData)
        } catch (error) {
            console.error("Error fetching messages:", error);
            setMessageData([]);
        }
    }


	useEffect(() => {
        fetchBotDetails(botId);
        fetchBotStatus(botId);

        const interval = setInterval(() => {
            fetchBotStatus(botId);
        }, 5000);

        return () => clearInterval(interval);
    }, [botId]);

    useEffect(() => {
        if (botStatus) {
            fetchData();
        } else {
            setServers([]);
            setChannels([]);
            setMessageData([]);
            setMessage(prev => ({
                ...prev,
                server: [],
                channel: [],
                msg: []
            }));
        }
    }, [botStatus]);

    useEffect(() => {
        getServerData()
    }, [message?.server]);
    
    useEffect(() => {
        getMessagesData()
    }, [message?.channel, message?.user, message?.type]);

    return (
        <>
		  <Group mb={4}>
				<BiLeftArrowAltIcon boxSize={6} cursor="pointer" onClick={()=> navigate(-1)} />
          </Group>
          <Group mb={4} width="100%" display="flex" justifyContent={{
                base: "center",
                sm: "center",
                md: "flex-start"
            }}>
                <TextUI fontSize="2xl" fontWeight="bold" mb={4}>
                    <Highlight query={botDetail?.username ? botDetail.username : "  "}
                        styles={{ px: "1.5", bg: "blue.200", borderRadius: "sm"}}
                    >{botDetail?.username ? botDetail.username : "  "}</Highlight> Bot Message Paneli
                </TextUI>
                <Badge
                    ml={3}
                    colorPalette={botStatus ? "green" : "red"}
                    variant="solid"
                >
                    {botStatus ? "Bot Aktif" : "Bot Aktif Değil"}
                </Badge>
                {!botStatus && (
                    <TextUI ml={3} fontSize="sm" color="red.500">
                        (Önce botu Bot Panel'den başlatın)
                    </TextUI>
                )}
            </Group>
			
			<Box 
                flex="0 0 50%" 
                p="4" 
                display={"flex"}
                gap={4}
                flexDirection={"column"}
            >
                <InputAndTextUI 
					value={message?.text}
					onChange={(e)=> setMessage({...message, text: e.target.value})}
                    label="Mesaj İçeriği" 
                    placeholder="Mesaj..."
					
                />

                <Flex gap={4}>
                    <SelectUI
                        value={message?.type}
                        title="Tür Seçin:  "
                        items={[
                            {label: 'Sunucu', value: 'guild'},
                            {label: 'Kullanıcı', value: 'dm'}
                        ]}
                        setValue={(val) => setMessage({...message, type: val})}
                    />

                    <SelectUI
                        value={message?.genre}
                        title="Gönderim Türü:  "
                        items={[
                            {label: 'Direkt Gönder', value: 'send'},
                            {label: 'Mesajı Yanıtla', value: 'reply'}
                        ]}
                        setValue={(val) => setMessage({...message, genre: val})}
                    />
                </Flex>

                <Flex gap={4}>
                    <SelectUI
                        value={message?.server}
                        title="Bir sunucu seçin: "
                        items={servers}
                        setValue={(val) => setMessage({...message, server: val})}
                    />
                    
                    <SelectUI
                        value={message?.channel}
                        title="Bir Kanal seçin: "
                        items={channels}
                        setValue={(val) => setMessage({...message, channel: val})}
                    />

                    <SelectUI
                        value={message?.msg}
                        title="Yanıtlanacak Mesajı seçin: "
                        items={messageData ? messageData : []}
                        setValue={(val) => setMessage({...message, msg: val})}
                    />
                </Flex>

                

                {/*
                <SelectUI
                    value={message?.user}
                    title="Bir Kullanıcı seçin: "
                    items={users}
                    setValue={(val) => setMessage({...message, user: val})}
                />
                */  }

                <InputAndTextUI 
					value={message?.user}
					onChange={(e)=> setMessage({...message, user: e.target.value})}
                    label="Kullanıcı ID'si" 
                    placeholder="ID..."
					
                />
					
                <Group>
                    <ButtonUI onClick={handleSubmit}>Gönder</ButtonUI>
                </Group>
            </Box>
        </>
    );
}