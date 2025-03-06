import { LivenessStatus, ReadinessStatus } from './types';

export class HealthService {
  livenessCheck() {
    return { status: LivenessStatus.OK };
  }

  readinessCheck() {
    return { status: ReadinessStatus.READY };
  }
}
