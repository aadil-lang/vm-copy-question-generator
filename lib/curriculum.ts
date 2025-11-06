import curriculumData from '../data/curriculum.json'

export function loadCurriculumSubskills(grade: string, curriculum: string): string[] {
  const curriculumKey = curriculum.replace(' ', '_').toUpperCase()
  const gradeKey = grade !== 'K' ? `Grade_${grade}` : 'Kindergarten'
  
  const curriculumObj = curriculumData[curriculumKey as keyof typeof curriculumData]
  if (curriculumObj && typeof curriculumObj === 'object') {
    const gradeData = curriculumObj[gradeKey as keyof typeof curriculumObj]
    if (Array.isArray(gradeData)) {
      return gradeData
    }
  }
  return []
}

