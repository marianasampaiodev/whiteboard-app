// server/server.js

// Importamos o Express para criar o servidor HTTP
const express = require('express')

// Importamos o módulo HTTP nativo do Node para integrar com o Socket.io
const http = require('http')

// Importamos o Socket.io para comunicação em tempo real via WebSocket
const { Server } = require('socket.io')

// Importamos o cors para permitir requisições do frontend (localhost:5173)
const cors = require('cors')

// Criamos a aplicação Express
const app = express()

// Aplicamos o middleware de CORS — sem isso o browser bloquearia
// as requisições do frontend (porta 5173) para o servidor (porta 3001)
app.use(cors())

// Criamos o servidor HTTP a partir do Express.
// O Socket.io precisa desse servidor HTTP para funcionar.
const httpServer = http.createServer(app)

// Criamos a instância do Socket.io vinculada ao servidor HTTP.
// Configuramos o CORS aqui também para as conexões WebSocket.
const io = new Server(httpServer, {
  cors: {
    // Permite conexões do frontend rodando no Vite
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

// ✅ Lógica principal do servidor de sinalização.
// Cada "socket" representa um usuário conectado.
io.on('connection', (socket) => {
  console.log(`✅ Usuário conectado: ${socket.id}`)

  // ── ENTRAR EM UMA SALA ──────────────────────────────────────────
  // O frontend emite 'join-room' com o ID da sala que quer entrar.
  // O servidor coloca o socket naquela sala do Socket.io.
  socket.on('join-room', (roomId) => {
    socket.join(roomId)
    console.log(`📦 Usuário ${socket.id} entrou na sala: ${roomId}`)

    // Avisa os OUTROS usuários da sala que um novo participante chegou.
    // "socket.to(roomId)" envia para todos na sala EXCETO quem enviou.
    socket.to(roomId).emit('user-joined', socket.id)
  })

  // ── SINALIZAÇÃO WebRTC: SDP OFFER ───────────────────────────────
  // Usuário A criou uma Offer e quer enviar para Usuário B.
  // O servidor recebe e repassa para o destinatário correto.
  // Ele NÃO processa nem entende o conteúdo — apenas faz o relay.
  socket.on('offer', ({ to, offer }) => {
    console.log(`📨 Offer de ${socket.id} para ${to}`)
    // Envia a offer apenas para o socket de destino (Usuário B)
    io.to(to).emit('offer', { from: socket.id, offer })
  })

  // ── SINALIZAÇÃO WebRTC: SDP ANSWER ──────────────────────────────
  // Usuário B criou uma Answer em resposta à Offer do Usuário A.
  // Mesmo esquema: recebe e repassa sem processar.
  socket.on('answer', ({ to, answer }) => {
    console.log(`📨 Answer de ${socket.id} para ${to}`)
    io.to(to).emit('answer', { from: socket.id, answer })
  })

  // ── SINALIZAÇÃO WebRTC: ICE CANDIDATES ──────────────────────────
  // ICE Candidates são os endereços de rede de cada usuário.
  // Cada navegador descobre seus próprios candidates e envia para o outro.
  // O servidor apenas faz o relay, igual às mensagens acima.
  socket.on('ice-candidate', ({ to, candidate }) => {
    console.log(`🧊 ICE Candidate de ${socket.id} para ${to}`)
    io.to(to).emit('ice-candidate', { from: socket.id, candidate })
  })

  // ── DESCONEXÃO ──────────────────────────────────────────────────
  // Quando um usuário fecha o navegador ou perde a conexão,
  // avisamos os outros da sala para que possam limpar a conexão WebRTC.
  socket.on('disconnect', () => {
    console.log(`❌ Usuário desconectado: ${socket.id}`)
    // Avisa todos os outros sockets que este usuário saiu
    socket.broadcast.emit('user-left', socket.id)
  })
})

// Rota simples para verificar se o servidor está de pé
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Servidor de sinalização rodando!' })
})

// Inicia o servidor na porta 3001
const PORT = 3001
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor de sinalização rodando em http://localhost:${PORT}`)
})