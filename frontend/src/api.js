import axios from 'axios'
const client = axios.create({ baseURL: '/api' })
export const getBotInfo = () => client.get('/bot-info').then(r => r.data)
export const getUpdates = () => client.get('/updates').then(r => r.data)
export const sendMessage = (chat_id, text) => client.post('/send', { chat_id, text }).then(r => r.data)
