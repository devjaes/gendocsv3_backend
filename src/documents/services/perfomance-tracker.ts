export class PerformanceTracker {
  private startTime: number
  private steps: Array<{ name: string; duration: number }> = []
  private lastStepTime: number

  constructor() {
    this.startTime = Date.now()
    this.lastStepTime = this.startTime
  }

  measureStep(stepName: string) {
    const currentTime = Date.now()
    const duration = currentTime - this.lastStepTime
    this.steps.push({
      name: stepName,
      duration,
    })
    this.lastStepTime = currentTime
    return duration
  }

  getResults() {
    const totalDuration = Date.now() - this.startTime
    return {
      steps: this.steps,
      totalDuration,
      summary: this.steps
        .map((step) => `${step.name}: ${step.duration}ms`)
        .join('\n'),
    }
  }
}
