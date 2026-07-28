import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

import { Flex, Box, Group, Highlight, Stack, Badge } from '@chakra-ui/react'
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import { TextUI, InputAndTextUI, ButtonUI } from '@ui'
import { botAPI } from '@requests'
import { BotPageSchema } from '@schemas'
import { showToast } from "@partials"
import { VscDebugStartIcon, VscDebugStopIcon, BiLeftArrowAltIcon } from "@icons"

export default function BotPage() {

    // auth 
    // const { someData } = useOutletContext();
    // console.log("Outlet context data:", someData);

    const { register, handleSubmit, formState: { errors } } = useForm({
        resolver: yupResolver(BotPageSchema)
    });

    const { botId } = useParams();
	const navigate = useNavigate()
    const [botDetail, setBotDetail] = useState(null);
    const [botStatus, setBotStatus] = useState(false);
    const [servers, setServers] = useState([]);

    const fetchBotDetails = async (id) => {
        try {
            const response = await botAPI.getBotById(id);
            setBotDetail(response.data);
        } catch (error) {
            console.error("Error fetching bot details:", error);
        }
    }

    const updateBot = async (data) =>{
        
        try {
            const response = await botAPI.updateBotInfo(botId, data)
            showToast({
                message: `${response.bot.username} Bot başarıyla güncellendi.`,
                type: 'success',
                id: 'bot-update-success',
                duration: 3000
            });
            fetchBotDetails(botId)
        } catch (error) {
            showToast({
                message: 'Bot güncellenemedi.',
                type: 'error',
                id: 'bot-update-error',
                duration: 3000
            });
            console.error('Error updating bot:', error);
        }
    }

    const handleBotUpdate = (data)=> {
        const filteredData = Object.fromEntries(
            Object.entries(data).filter(([key, value]) => value && value.trim() !== "")
        );
        updateBot(filteredData)
    }

    const fetchBotStatus = async (id) => {
        try {
            const response = await botAPI.botIsStatusById(id);
            setBotStatus(response?.started)            
        } catch (error) {
            console.error("Error fetching bot status:", error);
        }
    }
    
    const startBot = async () => {
        try {
            await botAPI.startBot(botId)
            showToast({
                message: `${botDetail?.username} Bot başlatıldı.`,
                type: 'success',
                id: 'bot-start-success',
                duration: 3000
            });
            fetchBotStatus(botId)
        } catch (error) {
            showToast({
                message: 'Bot başlatılamadı.',
                type: 'error',
                id: 'bot-start-error',
                duration: 3000
            });
            console.error('Error starting bot:', error);
        }
    }

    const stopBot = async () => {
        try {
            await botAPI.stopBot(botId)
            showToast({
                message: `${botDetail?.username} Bot durduruldu.`,
                type: 'success',
                id: 'bot-stop-success',
                duration: 3000
            });
            fetchBotStatus(botId)
        } catch (error) {
            showToast({
                message: 'Bot durdurulamadı.',
                type: 'error',
                id: 'bot-stop-error',
                duration: 3000
            });
            console.error('Error stopping bot:', error);
        }
    }

	async function getServers(){
        try {
            const result = await botAPI.servers(botId)
            if(!result?.status) return
            setServers(result?.data || [])
        } catch (error) {
            console.error("Error fetching servers:", error);
        }
	}

    useEffect(() => {
        fetchBotDetails(botId);
        fetchBotStatus(botId)
		
    }, [botId]);
	
	useEffect(()=> {
		if(botStatus) getServers()
	}, [botStatus])

    
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
                        styles={{ px: "1.5", bg: "red.400", borderRadius: "sm"}}
                    >{botDetail?.username ? botDetail.username : "  "}</Highlight> Bot Panel
                </TextUI>
            </Group>
            <Flex 
                width="100%" 
                height="55vh"
                direction={{ base: "column", md: "row" }}
            >
                
                <Box 
                    flex="0 0 50%" 
                    p="4"
                    
                >
                    <Group
                        display={"flex"}
                        justifyContent="flex-start"
                        alignItems={"flex-start"}
                        flexDirection={"column"}
                        gap={3}
                    >
                        <TextUI textStyle="lg">Bot Adı: {botDetail?.username}</TextUI>
                        <TextUI textStyle="lg">Bot ID: {botDetail?.botId}</TextUI>
                        <TextUI textStyle="lg">Bot Prefix: {botDetail?.prefix}</TextUI>
                    </Group>

                    <Group mt={10} gap={6}> 
                        {botStatus ? 
                        <TextUI fontWeight="semibold">Durdur <VscDebugStopIcon boxSize={10} cursor="pointer" onClick={stopBot} /></TextUI>  
                        : <TextUI fontWeight="semibold">Başlat <VscDebugStartIcon boxSize={12} cursor="pointer" onClick={startBot} /></TextUI> }
                    
						<TextUI fontWeight="semibold">Zorla Durdur <VscDebugStopIcon boxSize={10} cursor="pointer" onClick={stopBot} /></TextUI>  
                    
					</Group>
					
					<Group mt={10} display="block">
                        <ButtonUI onClick={()=>navigate('panel')}
							bg="red.500"
							_hover={{bg:"red.600"}}
						>Dashboard</ButtonUI>

                        <ButtonUI 
                            ml={3}
                            onClick={()=>navigate('message-panel')}
							bg="blue.500"
							_hover={{bg:"blue.600"}}
						>Message Panel</ButtonUI>
					</Group>
					
					<Flex
					  mt={10}
					  gap={3}
					  flexWrap="wrap"    
					  justifyContent="flex-start"
					>
					  {servers?.map((server, key) => (
						<Badge
						  key={key}
						  variant="solid"
						  colorPalette="yellow"
						  mb={2}
						>
						  {server?.name}
						</Badge>
					  ))}
					</Flex>
                </Box>

                <Box 
                    flex="0 0 50%" 
                    p="4" 
                    display={"flex"}
                    gap={4}
                    flexDirection={"column"}
                >
                    <InputAndTextUI 
                        label="Prefix" 
                        placeholder="Bot Prefix'ini giriniz.."
                        {...register('prefix')}
                        errorText={errors?.prefix?.message} 
                    />
                    <InputAndTextUI 
                        label="Token" 
                        placeholder="Bot tokenini giriniz.."
                        errorText={errors?.token?.message} 
                        {...register('token')}
                    />
					
                    <Group>
                        <ButtonUI onClick={handleSubmit(handleBotUpdate)}>Güncelle</ButtonUI>
                    </Group>
                </Box>
				
				
            </Flex>
        </>
    );
}