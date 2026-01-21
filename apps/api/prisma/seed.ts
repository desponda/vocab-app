import { PrismaClient, QuestionType, TestStatus, TestType } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean up existing test data (optional - comment out if you want to preserve data)
  console.log('🧹 Cleaning up existing test data...');
  await prisma.testAttemptAnswer.deleteMany({});
  await prisma.testAttempt.deleteMany({});
  await prisma.testAssignment.deleteMany({});
  await prisma.testQuestion.deleteMany({});
  await prisma.test.deleteMany({});
  await prisma.vocabularyWord.deleteMany({});
  await prisma.vocabularySheet.deleteMany({});
  await prisma.enrollment.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.classroom.deleteMany({});
  await prisma.user.deleteMany({
    where: {
      email: {
        in: [
          'teacher@test.com',
          'student1@test.com',
          'student2@test.com',
          'student3@test.com',
        ],
      },
    },
  });

  const hashedPassword = await bcrypt.hash('Test1234!', 10);

  // Create teacher user
  console.log('👨‍🏫 Creating teacher user...');
  const teacher = await prisma.user.create({
    data: {
      name: 'Test Teacher',
      email: 'teacher@test.com',
      password: hashedPassword,
      role: 'TEACHER',
    },
  });

  // Create classroom
  console.log('🏫 Creating classroom...');
  const classroom = await prisma.classroom.create({
    data: {
      name: 'Test Classroom - 5th Grade',
      code: 'TEST01',
      gradeLevel: 5,
      teacherId: teacher.id,
    },
  });

  // Create student users
  console.log('👨‍🎓 Creating student users...');
  const students = [];

  for (let i = 1; i <= 3; i++) {
    const studentUser = await prisma.user.create({
      data: {
        name: `Test Student ${i}`,
        email: `student${i}@test.com`,
        password: hashedPassword,
        role: 'STUDENT',
      },
    });

    const student = await prisma.student.create({
      data: {
        userId: studentUser.id,
        enrollments: {
          create: {
            classroomId: classroom.id,
          },
        },
      },
    });

    students.push(student);
  }

  // Create vocabulary sheet
  console.log('📚 Creating vocabulary sheet...');
  const vocabSheet = await prisma.vocabularySheet.create({
    data: {
      name: 'Test Vocabulary - Chapter 1',
      originalName: 'test-vocab-chapter-1.png',
      fileUrl: 's3://test-bucket/test-vocab.png',
      classroomId: classroom.id,
      uploadedBy: teacher.id,
      gradeLevel: 5,
      testType: 'VOCABULARY',
      status: 'COMPLETED',
      processedAt: new Date(),
    },
  });

  // Create vocabulary words
  console.log('📝 Creating vocabulary words...');
  const words = [
    { word: 'abundant', definition: 'existing in large quantities; plentiful' },
    { word: 'benevolent', definition: 'well-meaning and kindly' },
    { word: 'candid', definition: 'truthful and straightforward; frank' },
    { word: 'diligent', definition: 'having or showing care in one\'s work' },
    { word: 'eloquent', definition: 'fluent or persuasive in speaking or writing' },
    { word: 'frugal', definition: 'sparing or economical with resources' },
    { word: 'genuine', definition: 'truly what it is said to be; authentic' },
    { word: 'humble', definition: 'having a modest opinion of oneself' },
    { word: 'integrity', definition: 'the quality of being honest' },
    { word: 'jubilant', definition: 'feeling or expressing great joy' },
  ];

  const createdWords = [];
  for (let i = 0; i < words.length; i++) {
    const word = await prisma.vocabularyWord.create({
      data: {
        word: words[i].word,
        definition: words[i].definition,
        sheetId: vocabSheet.id,
        orderIndex: i,
      },
    });
    createdWords.push(word);
  }

  // Create test
  console.log('📋 Creating test...');
  const test = await prisma.test.create({
    data: {
      name: 'Chapter 1 Vocabulary Test',
      variant: 1,
      sheetId: vocabSheet.id,
    },
  });

  // Create test questions
  console.log('❓ Creating test questions...');
  const questionTypes: QuestionType[] = ['MULTIPLE_CHOICE', 'FILL_IN_BLANK', 'SPELLING'];

  for (let i = 0; i < createdWords.length; i++) {
    const word = createdWords[i];
    const questionType = questionTypes[i % questionTypes.length];

    let options: string[] | undefined;
    if (questionType === 'MULTIPLE_CHOICE') {
      // Create plausible wrong answers
      const wrongAnswers = createdWords
        .filter((w) => w.id !== word.id)
        .map((w) => w.definition)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      options = [word.definition, ...wrongAnswers].sort(() => Math.random() - 0.5);
    }

    await prisma.testQuestion.create({
      data: {
        testId: test.id,
        wordId: word.id,
        questionType,
        questionText:
          questionType === 'SPELLING'
            ? `Spell the word that means: ${word.definition}`
            : `What is the definition of "${word.word}"?`,
        correctAnswer: questionType === 'SPELLING' ? word.word : word.definition,
        options: options || [],
        orderIndex: i,
      },
    });
  }

  // Assign test to students
  console.log('📤 Assigning tests to students...');
  for (const student of students) {
    await prisma.testAssignment.create({
      data: {
        testId: test.id,
        studentId: student.id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });
  }

  // Create a completed test attempt for student 1
  console.log('✅ Creating completed test attempt for student 1...');
  const questions = await prisma.testQuestion.findMany({
    where: { testId: test.id },
    include: { word: true },
  });

  const testAttempt = await prisma.testAttempt.create({
    data: {
      testId: test.id,
      studentId: students[0].id,
      status: 'SUBMITTED',
      startedAt: new Date(),
      submittedAt: new Date(),
    },
  });

  let correctCount = 0;
  for (const question of questions) {
    // Make first 7 correct, last 3 incorrect
    const isCorrect = correctCount < 7;
    const answer = isCorrect
      ? question.correctAnswer
      : 'wrong answer';

    await prisma.testAttemptAnswer.create({
      data: {
        attemptId: testAttempt.id,
        questionId: question.id,
        answer,
        isCorrect,
        answeredAt: new Date(),
      },
    });

    if (isCorrect) correctCount++;
  }

  // Update attempt score
  await prisma.testAttempt.update({
    where: { id: testAttempt.id },
    data: {
      score: Math.round((correctCount / questions.length) * 100),
    },
  });

  // Create in-progress attempt for student 2
  console.log('⏳ Creating in-progress test attempt for student 2...');
  const inProgressAttempt = await prisma.testAttempt.create({
    data: {
      testId: test.id,
      studentId: students[1].id,
      status: 'IN_PROGRESS',
      startedAt: new Date(),
      currentQuestionIndex: 3,
    },
  });

  // Answer first 3 questions
  for (let i = 0; i < 3; i++) {
    await prisma.testAttemptAnswer.create({
      data: {
        attemptId: inProgressAttempt.id,
        questionId: questions[i].id,
        answer: questions[i].correctAnswer,
        isCorrect: true,
        answeredAt: new Date(),
      },
    });
  }

  console.log('✅ Seed completed successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - Teacher: teacher@test.com (password: Test1234!)`);
  console.log(`  - Students: student1@test.com, student2@test.com, student3@test.com (password: Test1234!)`);
  console.log(`  - Classroom: Test Classroom - 5th Grade (code: TEST01)`);
  console.log(`  - Vocabulary Sheet: Test Vocabulary - Chapter 1`);
  console.log(`  - Words: ${words.length} vocabulary words`);
  console.log(`  - Test: Chapter 1 Vocabulary Test (${questions.length} questions)`);
  console.log(`  - Student 1: Completed test with 70% score`);
  console.log(`  - Student 2: In-progress test (3/${questions.length} answered)`);
  console.log(`  - Student 3: Test assigned but not started`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
