import type { Student } from "./student.types.js";

let students: Student[] = [];

export function getAll(): Student[] {
  return students;
}

export function add(student: Student): void {
  students.push(student);
}

export function reset(): void {
  students = [];
}

export function remove(student: Student): void {
  students = students.filter((currentStudent) => currentStudent !== student);
}
