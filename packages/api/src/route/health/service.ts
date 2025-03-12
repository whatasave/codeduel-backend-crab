import type { LivenessStatus, ReadinessStatus } from './data';

export class HealthService {
  livenessCheck(): LivenessStatus {
    return 'ok';
  }

  readinessCheck(): ReadinessStatus {
    return 'ready';
  }
}
