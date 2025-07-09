export class CurrentCalledQueueDto {
  id: string;
  queueNumber: string;
  type: 'RESERVATION' | 'WALK_IN';
  status: string;
  customerName?: string;
  calledAt?: Date;
  staff?: {
    id: string;
    name: string;
    username: string;
  };
}

export class QueueStatisticsDto {
  totalToday: number;
  waitingCount: number;
  calledCount: number;
  servingCount: number;
  completedCount: number;
  reservationCount: number;
  walkInCount: number;
}

export class RecentCompletedQueueDto {
  id: string;
  queueNumber: string;
  type: 'RESERVATION' | 'WALK_IN';
  status: string;
  customerName?: string;
  completedAt?: Date;
  serviceDuration?: number;
  staff?: {
    id: string;
    name: string;
    username: string;
  };
}

export class NextWaitingQueueDto {
  id: string;
  queueNumber: string;
  type: 'RESERVATION' | 'WALK_IN';
  customerName?: string;
  createdAt: Date;
}