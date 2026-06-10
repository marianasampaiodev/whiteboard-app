// src/webrtc/peer.ts

// Importamos o cliente do Socket.io para conectar ao servidor de sinalização
import { io, Socket } from 'socket.io-client'

// Configuração dos servidores STUN — servidores públicos do Google
// que ajudam o navegador a descobrir seu endereço IP público.
// Sem isso, a conexão só funcionaria em redes locais.
const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
}

// Tipo para as callbacks que o App.tsx vai passar para este módulo.
// onDataChannel: chamada quando o canal de dados estiver pronto.
// onMessage: chamada quando receber dados do outro usuário.
interface PeerCallbacks {
  onDataChannel: (channel: RTCDataChannel) => void
  onMessage: (data: ArrayBuffer) => void
}

// Variáveis de estado da conexão WebRTC.
// Ficam fora da função para persistir entre chamadas.
let socket: Socket | null = null
let peerConnection: RTCPeerConnection | null = null
let dataChannel: RTCDataChannel | null = null

// ✅ Função principal — inicia toda a lógica de sinalização e WebRTC.
// roomId: ID da sala que o usuário quer entrar
// callbacks: funções chamadas quando eventos importantes acontecerem
export function initPeer(roomId: string, callbacks: PeerCallbacks) {

  // ── Conecta ao servidor de sinalização ──────────────────────────
  socket = io('http://localhost:3001')

  socket.on('connect', () => {
    console.log('✅ Conectado ao servidor de sinalização:', socket!.id)
    // Entra na sala assim que conectar
    socket!.emit('join-room', roomId)
  })

  // ── Quando outro usuário entrar na sala (somos o Usuário A) ─────
  // Criamos a Offer e o DataChannel
  socket.on('user-joined', async (remoteId: string) => {
    console.log('👤 Novo usuário na sala:', remoteId)

    // Cria a conexão WebRTC
    peerConnection = createPeerConnection(remoteId)

    // ✅ Usuário A cria o DataChannel ANTES de criar a Offer.
    // O canal precisa existir antes do handshake para ser incluído na negociação.
    dataChannel = peerConnection.createDataChannel('desenho')
    setupDataChannel(dataChannel, callbacks)

    // Cria a Offer (descrição das capacidades deste lado)
    const offer = await peerConnection.createOffer()

    // Define a Offer como descrição local (nosso lado da conexão)
    await peerConnection.setLocalDescription(offer)

    // Envia a Offer para o Usuário B via servidor de sinalização
    socket!.emit('offer', { to: remoteId, offer })
    console.log('📨 Offer enviada para:', remoteId)
  })

  // ── Quando receber uma Offer (somos o Usuário B) ─────────────────
  socket.on('offer', async ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => {
    console.log('📨 Offer recebida de:', from)

    // Cria a conexão WebRTC
    peerConnection = createPeerConnection(from)

    // ✅ Usuário B escuta ondatachannel — o canal foi criado pelo Usuário A
    // e chegou junto com a Offer. Configuramos os listeners quando estiver pronto.
    peerConnection.ondatachannel = (event) => {
      dataChannel = event.channel
      setupDataChannel(dataChannel, callbacks)
    }

    // Define a Offer recebida como descrição remota (lado do Usuário A)
    await peerConnection.setRemoteDescription(offer)

    // Cria a Answer (nossa resposta à Offer)
    const answer = await peerConnection.createAnswer()

    // Define a Answer como descrição local (nosso lado)
    await peerConnection.setLocalDescription(answer)

    // Envia a Answer de volta para o Usuário A
    socket!.emit('answer', { to: from, answer })
    console.log('📨 Answer enviada para:', from)
  })

  // ── Quando receber uma Answer (somos o Usuário A) ────────────────
  socket.on('answer', async ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => {
    console.log('📨 Answer recebida de:', from)

    if (!peerConnection) return

    // Define a Answer como descrição remota (lado do Usuário B).
    // Após isso o WebRTC tem as descrições dos dois lados e começa
    // a trocar ICE Candidates para estabelecer a conexão direta.
    await peerConnection.setRemoteDescription(answer)
  })

  // ── Quando receber um ICE Candidate do outro lado ────────────────
  socket.on('ice-candidate', async ({ candidate }: { candidate: RTCIceCandidateInit }) => {
    if (!peerConnection) return

    try {
      // Adiciona o candidate de rede do outro lado.
      // O WebRTC testa cada candidate até encontrar um caminho direto.
      await peerConnection.addIceCandidate(candidate)
      console.log('🧊 ICE Candidate adicionado')
    } catch (err) {
      console.error('Erro ao adicionar ICE Candidate:', err)
    }
  })

  // ── Quando um usuário sair ───────────────────────────────────────
  socket.on('user-left', () => {
    console.log('👋 Usuário saiu da sala')
    // Fecha e limpa a conexão WebRTC
    closePeer()
  })
}

// ✅ Cria e configura o RTCPeerConnection.
// Separado em função própria porque tanto Usuário A quanto B precisam criar.
function createPeerConnection(remoteId: string): RTCPeerConnection {
  const pc = new RTCPeerConnection(RTC_CONFIG)

  // Quando o navegador descobrir um ICE Candidate (endereço de rede),
  // enviamos imediatamente para o outro lado via servidor de sinalização.
  pc.onicecandidate = (event) => {
    if (event.candidate && socket) {
      socket.emit('ice-candidate', {
        to: remoteId,
        candidate: event.candidate,
      })
      console.log('🧊 ICE Candidate enviado para:', remoteId)
    }
  }

  // Monitora o estado da conexão ICE para debug
  pc.oniceconnectionstatechange = () => {
    console.log('🔌 Estado ICE:', pc.iceConnectionState)
  }

  // Monitora o estado geral da conexão para debug
  pc.onconnectionstatechange = () => {
    console.log('🔌 Estado da conexão:', pc.connectionState)
  }

  return pc
}

// ✅ Configura os listeners do DataChannel.
// Chamada tanto pelo Usuário A (que criou o canal)
// quanto pelo Usuário B (que recebeu via ondatachannel).
function setupDataChannel(channel: RTCDataChannel, callbacks: PeerCallbacks) {

  // Quando o canal estiver aberto e pronto para enviar dados
  channel.onopen = () => {
    console.log('✅ DataChannel aberto! Conexão P2P estabelecida.')
    callbacks.onDataChannel(channel)
  }

  // Quando receber uma mensagem do outro usuário
  channel.onmessage = (event) => {
    // Os dados chegam como ArrayBuffer (binário do Yjs)
    callbacks.onMessage(event.data as ArrayBuffer)
  }

  // Quando o canal for fechado
  channel.onclose = () => {
    console.log('❌ DataChannel fechado.')
  }

  // Quando ocorrer um erro no canal
  channel.onerror = (err) => {
    console.error('❌ Erro no DataChannel:', err)
  }
}

// ✅ Fecha e limpa todos os recursos WebRTC.
// Chamada quando um usuário sai da sala.
export function closePeer() {
  if (dataChannel) {
    dataChannel.close()
    dataChannel = null
  }
  if (peerConnection) {
    peerConnection.close()
    peerConnection = null
  }
  console.log('🔌 Conexão WebRTC encerrada.')
}

// ✅ Retorna o DataChannel ativo para o Passo 5 usar ao enviar updates do Yjs.
// Retorna null se a conexão ainda não estiver estabelecida.
export function getDataChannel(): RTCDataChannel | null {
  return dataChannel
}