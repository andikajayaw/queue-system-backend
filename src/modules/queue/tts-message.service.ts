import { Injectable } from '@nestjs/common';
import { Queue, QueueType, QueueStatus } from '@prisma/client';

export interface TtsConfig {
  voice: {
    rate: number;
    pitch: number;
    volume: number;
    lang: string;
  };
  messages: {
    queueCreated: string;
    queueCalled: string;
    queueCalledUrgent: string;
    queueServing: string;
    queueCompleted: string;
    queueCancelled: string;
    queueDeleted: string;
    queueReset: string;
    noQueueWaiting: string;
    welcomeMessage: string;
  };
  queueTypes: {
    RESERVATION: string;
    WALK_IN: string;
  };
}

@Injectable()
export class TtsMessageService {
  private ttsConfig: TtsConfig = {
    voice: {
      rate: 1,
      pitch: 1,
      volume: 1,
      lang: 'id-ID', // Bahasa Indonesia
    },
    messages: {
      queueCreated:
        'Nomor antrian {queueNumber} telah dibuat untuk {queueType}',
      queueCalled: 'Nomor antrian {queueNumber} silakan ke loket',
      queueCalledUrgent:
        'Perhatian! Nomor antrian {queueNumber} segera ke loket',
      queueServing: 'Nomor antrian {queueNumber} sedang dilayani',
      queueCompleted: 'Nomor antrian {queueNumber} telah selesai',
      queueCancelled: 'Nomor antrian {queueNumber} telah dibatalkan',
      queueDeleted: 'Nomor antrian {queueNumber} telah dihapus',
      queueReset: 'Sistem antrian telah direset',
      noQueueWaiting: 'Tidak ada antrian {queueType} yang menunggu',
      welcomeMessage: 'Selamat datang di sistem antrian',
    },
    queueTypes: {
      RESERVATION: 'reservasi',
      WALK_IN: 'walk-in',
    },
  };

  generateCreateMessage(queue: Queue): string {
    const queueType = this.ttsConfig.queueTypes[queue.type];
    return this.ttsConfig.messages.queueCreated
      .replace('{queueNumber}', queue.queueNumber)
      .replace('{queueType}', queueType);
  }

  generateCallMessage(queue: Queue, isUrgent: boolean = false): string {
    const template = isUrgent
      ? this.ttsConfig.messages.queueCalledUrgent
      : this.ttsConfig.messages.queueCalled;

    return template.replace('{queueNumber}', queue.queueNumber);
  }

  generateUpdateMessage(queue: Queue): string {
    let template = '';

    switch (queue.status) {
      case QueueStatus.CALLED:
        template = this.ttsConfig.messages.queueCalled;
        break;
      case QueueStatus.SERVING:
        template = this.ttsConfig.messages.queueServing;
        break;
      case QueueStatus.COMPLETED:
        template = this.ttsConfig.messages.queueCompleted;
        break;
      case QueueStatus.CANCELLED:
        template = this.ttsConfig.messages.queueCancelled;
        break;
      default:
        template = 'Status nomor antrian {queueNumber} telah diperbarui';
    }

    return template.replace('{queueNumber}', queue.queueNumber);
  }

  generateDeleteMessage(queue: Queue): string {
    return this.ttsConfig.messages.queueDeleted.replace(
      '{queueNumber}',
      queue.queueNumber,
    );
  }

  generateNoQueueMessage(type?: QueueType): string {
    if (type) {
      const queueType = this.ttsConfig.queueTypes[type];
      return this.ttsConfig.messages.noQueueWaiting.replace(
        '{queueType}',
        queueType,
      );
    }
    return 'Tidak ada antrian yang menunggu';
  }

  generateResetMessage(): string {
    return this.ttsConfig.messages.queueReset;
  }

  generateWelcomeMessage(): string {
    return this.ttsConfig.messages.welcomeMessage;
  }

  // Custom message with queue number
  generateCustomMessage(
    template: string,
    queueNumber: string,
    additionalParams?: Record<string, string>,
  ): string {
    let message = template.replace('{queueNumber}', queueNumber);

    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        message = message.replace(`{${key}}`, value);
      });
    }

    return message;
  }

  // Get current TTS configuration
  getTtsConfig(): TtsConfig {
    return { ...this.ttsConfig };
  }

  // Update TTS configuration
  updateTtsConfig(newConfig: Partial<TtsConfig>): TtsConfig {
    this.ttsConfig = {
      ...this.ttsConfig,
      ...newConfig,
      voice: {
        ...this.ttsConfig.voice,
        ...newConfig.voice,
      },
      messages: {
        ...this.ttsConfig.messages,
        ...newConfig.messages,
      },
      queueTypes: {
        ...this.ttsConfig.queueTypes,
        ...newConfig.queueTypes,
      },
    };

    return this.getTtsConfig();
  }

  // Generate message for queue statistics
  generateStatsMessage(stats: any): string {
    const { today, status } = stats;
    return `Total antrian hari ini: ${today.total}. Reservasi: ${today.reservation}. Walk-in: ${today.walkIn}. Menunggu: ${status.waiting}. Sedang dilayani: ${status.serving}`;
  }

  // Generate message for queue position
  generatePositionMessage(queueNumber: string, position: number): string {
    return `Nomor antrian ${queueNumber} berada di posisi ${position} dalam antrian`;
  }

  // Generate message for estimated waiting time
  generateWaitingTimeMessage(
    queueNumber: string,
    estimatedMinutes: number,
  ): string {
    return `Nomor antrian ${queueNumber} perkiraan waktu tunggu ${estimatedMinutes} menit`;
  }

  // Generate message for queue announcement
  generateAnnouncementMessage(message: string): string {
    return `Pengumuman: ${message}`;
  }

  // Generate message for break time
  generateBreakMessage(duration: number): string {
    return `Pelayanan akan dijeda selama ${duration} menit`;
  }

  // Generate message for service resume
  generateResumeMessage(): string {
    return `Pelayanan telah dilanjutkan kembali`;
  }

  // Generate message for closing announcement
  generateClosingMessage(): string {
    return `Pelayanan hari ini telah berakhir. Terima kasih atas kunjungan Anda`;
  }
}
