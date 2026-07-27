export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  gradeLevel: number;
  externalId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStudentInput {
  firstName: string;
  lastName: string;
  gradeLevel: number;
  externalId: string;
}