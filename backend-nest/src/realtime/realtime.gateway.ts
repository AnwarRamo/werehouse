import { Logger } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export type AttendanceUpdateEventPayload = {
  employeeId: string;
  employeeName: string;
  type: 'IN' | 'OUT';
  timestamp: string;
  date: string;
  time: string;
  source: 'biometric';
  status: 'success';
  action: 'created' | 'updated';
  message: string;
};

const normalizeOrigin = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  try {
    return new URL(trimmed).origin;
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
};

const resolveSocketCorsOrigin = () => {
  const configuredOrigins = String(process.env.CORS_ORIGIN || '')
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter(Boolean);

  if (configuredOrigins.length > 0) {
    return configuredOrigins;
  }

  return process.env.NODE_ENV === 'production' ? false : true;
};

@WebSocketGateway({
  namespace: '/realtime',
  cors: {
    origin: resolveSocketCorsOrigin(),
    credentials: true,
  },
})
export class RealtimeGateway {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server!: Server;

  emitAttendanceUpdate(payload: AttendanceUpdateEventPayload) {
    if (!this.server) {
      this.logger.warn('Realtime server is not initialized yet; attendance event skipped');
      return;
    }

    this.server.emit('attendanceUpdate', payload);
  }
}
