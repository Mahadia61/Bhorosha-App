# Simple ER diagram

This simplified diagram shows the main academic features. The app uses
Firestore; this is a logical data model.

```mermaid
erDiagram
  DEPARTMENT {
    string department_id PK
    string name
  }
  USER {
    string user_id PK
    string name
    string email
    string role
    string department_id FK
  }
  TEACHER {
    string teacher_id PK
    string name
    string designation
    string department_id FK
  }
  COURSE {
    string course_id PK
    string code
    string title
    string department_id FK
  }
  REVIEW {
    string review_id PK
    string user_id FK
    string course_id FK
    string teacher_id FK
    string rating
    string text
  }
  QUESTION {
    string question_id PK
    string user_id FK
    string course_id FK
    string text
  }
  ANSWER {
    string answer_id PK
    string question_id FK
    string user_id FK
    string text
  }

  DEPARTMENT ||--o{ USER : has (1:M)
  DEPARTMENT ||--o{ TEACHER : has (1:M)
  DEPARTMENT ||--o{ COURSE : offers (1:M)
  TEACHER }o--o{ COURSE : teaches (M:N)
  USER ||--o{ REVIEW : writes (1:M)
  COURSE o|--o{ REVIEW : receives (1:M)
  TEACHER o|--o{ REVIEW : receives (1:M)
  USER ||--o{ QUESTION : asks (1:M)
  COURSE ||--o{ QUESTION : has (1:M)
  QUESTION ||--o{ ANSWER : receives (1:M)
  USER ||--o{ ANSWER : writes (1:M)
```

Each review is about either a course or a teacher. The course-teacher
relationship is many-to-many; a relational database would represent it with a
junction table.
