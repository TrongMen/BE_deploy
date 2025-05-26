import { io } from 'socket.io-client';

const socket = io('http://localhost:3005', {
    transports: ['websocket'],
    reconnection: true,
});

export const emitGroupEvent = (conversation_id, event, data) => {
    socket.emit('group-event-from-backend', {
        conversation_id,
        event,
        data,
    });
};
