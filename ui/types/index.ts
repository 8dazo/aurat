export interface PersonalInfo {
  first_name: string
  last_name: string
  email?: string
  phone?: string
  location?: string
}

export interface MasterProfile {
  personal_info: PersonalInfo
  inferred_traits: {
    requires_sponsorship: boolean
    willing_to_relocate: boolean
    years_of_experience?: number
  }
  links: {
    github?: string
    linkedin?: string
    leetcode?: string
    portfolio?: string
  }
  experience: Array<{
    company: string
    title: string
    description?: string
    highlights: string[]
  }>
  education: Array<{
    institution: string
    degree: string
    field?: string
  }>
  skills: Array<{
    category: string
    skills: string[]
  }>
  custom_qna_memory: Record<string, string>
}