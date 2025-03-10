import { LivenessStatus, ReadinessStatus } from './types';

export class HealthService {
  livenessCheck(): { status: LivenessStatus } {
    return { status: LivenessStatus.OK };
  }

  readinessCheck(): { status: ReadinessStatus } {
    return { status: ReadinessStatus.READY };
  }
}
