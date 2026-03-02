export interface Project {
  rank: number
  name: string
  repoUrl: string
  repoOwner: string
  repoName: string
  track: string
  trackNumber: number
  scores: {
    technicity: number
    creativity: number
    usefulness: number
    alignment: number
    total: number
  }
  summary: string
  strengths: string[]
  improvements: string[]
  specialChallenges: string[]
  flags: string[]
  reportFile: string
}
