// Comprehensive UI translations for Vocaband
export type Language = 'en' | 'he' | 'ar';

export const translations: Record<Language, Record<string, string>> = {
  en: {
    // App Header
    appTitle: 'Vocaband',
    appSubtitle: 'Israeli English Curriculum Learning Platform',

    // Language Switcher
    selectLanguage: 'Select Language',
    languageEnglish: 'English',
    languageHebrew: 'עברית',
    languageArabic: 'العربية',

    // Roles
    roleStudent: 'Student',
    roleTeacher: 'Teacher',

    // Auth - Login/Signup
    signIn: 'Sign In',
    signUp: 'Create Account',
    loginTitle: 'Student Login',
    teacherLogin: 'Teacher Login',
    createTeacherAccount: 'Create Teacher Account',
    createStudentAccount: 'Create Student Account',
    email: 'Email',
    password: 'Password',
    fullName: 'Full Name',
    emailPlaceholder: 'student@email.com',
    teacherEmailPlaceholder: 'teacher@school.il',
    passwordPlaceholder: '••••••••',
    namePlaceholder: 'John Smith',
    teacherNamePlaceholder: 'Ms. Cohen',
    loading: 'Loading...',
    errorOccurred: 'An error occurred. Please try again.',
    nameRequired: 'Please enter your name',
    passwordTooShort: 'Password must be at least 6 characters',
    invalidEmail: 'Please enter a valid email address',

    // Toggle between login/signup
    noAccount: "Don't have an account? Sign up",
    hasAccount: 'Already have an account? Sign in',
    oldTeacherLogin: 'Old teacher login →',

    // Student Dashboard
    studentDashboard: 'Student Dashboard',
    welcome: 'Welcome',
    myClasses: 'My Classes',
    myAssignments: 'My Assignments',
    practiceMode: 'Practice Mode',
    signOut: 'Sign Out',
    joinClass: '+ Join Class',
    joinYourFirstClass: 'Join Your First Class',
    noClasses: "You haven't joined any classes yet.",
    noAssignments: 'No assignments yet. Check back soon!',
    joinClassFirst: 'Join a class first to see assignments.',
    grade: 'Grade',
    classCode: 'Code',

    // Class Join
    joinClassTitle: 'Join a Class',
    joinClassDescription: 'Enter the class code provided by your teacher to join their class.',
    enterClassCode: 'Enter Class Code',
    classCodePlaceholder: 'e.g., ABC123',
    joinButton: 'Join Class',
    invalidClassCode: 'Please enter a valid 6-character class code',
    classNotFound: 'Class not found. Please check the code and try again.',
    alreadyEnrolled: 'You are already enrolled in this class.',
    classJoinedSuccess: 'Successfully joined the class!',

    // Assignments
    assignmentNotStarted: 'Not Started',
    assignmentInProgress: 'In Progress',
    assignmentCompleted: 'Completed',
    assignmentOverdue: 'Overdue',
    words: 'words',
    wordsLearned: 'words learned',
    due: 'Due',
    startAssignment: 'Start',
    reviewAssignment: 'Review',
    totalWords: 'Total Words',
    chooseStudyMode: 'Choose Study Mode',

    // Study Modes
    flashcardsMode: 'Flashcards',
    flashcardsDescription: 'Flip cards to learn each word. Mark as known or unknown to track progress.',
    quizMode: 'Quiz Mode',
    quizModeDescription: 'Test your knowledge with multiple choice questions.',

    // Flashcard UI
    yourProgress: 'Your Progress',
    tapToReveal: 'Tap to reveal translation',
    stillLearning: 'Still Learning',
    gotIt: 'Got It!',
    sessionComplete: 'Session Complete!',
    sessionCompleteMessage: 'You reviewed {count} words. Keep practicing daily to master your vocabulary!',
    continue: 'Continue',
    example: 'Example:',

    // Status Labels
    statusNew: 'New',
    statusLearning: 'Learning',
    statusReview: 'Review',
    statusMastered: 'Mastered',

    // Teacher Dashboard
    teacherDashboard: 'Teacher Dashboard',
    welcomeTeacher: 'Welcome',
    myClassesTeacher: 'My Classes',
    createClass: '+ Create Class',
   createClassDescription: 'Create a new class and share the code with your students.',
    noClassesTeacher: "You haven't created any classes yet.",
    createFirstClass: 'Create Your First Class',

    // Create Class
    createClassTitle: 'Create New Class',
    className: 'Class Name',
    classNamePlaceholder: 'e.g., 7th Grade English - Class A',
    gradeLevel: 'Grade Level',
    selectGrade: 'Select Grade',
    grade7: 'Grade 7',
    grade8: 'Grade 8',
    grade9: 'Grade 9',
    other: 'Other',
    classCreated: 'Class created successfully!',
    classCodeShare: 'Share this code with your students:',

    // Assignments Management
    assignments: 'Assignments',
    createAssignment: '+ Create Assignment',
    noAssignmentsTeacher: "You haven't created any assignments yet.",
    createFirstAssignment: 'Create Your First Assignment',
    viewResults: 'Results',
    editAssignment: 'Edit',
    deleteAssignment: 'Delete',

    // Create Assignment
    createAssignmentTitle: 'Create New Assignment',
    assignmentTitle: 'Assignment Title',
    assignmentTitlePlaceholder: 'e.g., Unit 1 Vocabulary',
    description: 'Description',
    descriptionPlaceholder: 'Optional instructions for students...',
    selectClass: 'Select Class',
    selectWords: 'Select Words',
    numWords: 'Number of Words',
    numWordsPlaceholder: 'e.g., 20',
    deadline: 'Deadline',
    selectDeadline: 'Select Deadline',
    assignmentCreated: 'Assignment created successfully!',

    // Word Selection
    selectWordsTitle: 'Select Words for Assignment',
    selectWordsDescription: 'Choose the vocabulary words to include in this assignment.',
    filterByCategory: 'Filter by Category',
    filterByType: 'Filter by Type',
    allCategories: 'All Categories',
    allTypes: 'All Types',
    searchWords: 'Search words...',
    selected: 'Selected',
    saveSelection: 'Save Selection',

    // Assignment Results
    assignmentResults: 'Assignment Results',
    studentProgress: 'Student Progress',
    totalStudents: 'Total Students',
    completionRate: 'Completion Rate',
    inProgress: 'In Progress',
    avgQuizScore: 'Avg Quiz Score',
    noStudentsAssigned: 'No students have been assigned this work yet.',
    lastActivity: 'Last activity',
    score: 'Score',

    // Voice Settings
    voiceSettings: 'Voice Settings',
    voice: 'Voice',

    // Navigation
    back: 'Back',
    home: 'Home',

    // Common
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    submit: 'Submit',
    or: 'or',

    // Errors
    error: 'Error',
    required: 'Required',
  },

  he: {
    // App Header
    appTitle: 'אוצר מילים - רמה II',
    appSubtitle: 'פלטפורמת למידה לתוכנית הלימודים באנגלית',

    // Language Switcher
    selectLanguage: 'בחר שפה',
    languageEnglish: 'English',
    languageHebrew: 'עברית',
    languageArabic: 'العربية',

    // Roles
    roleStudent: 'תלמיד',
    roleTeacher: 'מורה',

    // Auth - Login/Signup
    signIn: 'התחברות',
    signUp: 'יצירת חשבון',
    loginTitle: 'כניסת תלמיד',
    teacherLogin: 'כניסת מורה',
    createTeacherAccount: 'יצירת חשבון מורה',
    createStudentAccount: 'יצירת חשבון תלמיד',
    email: 'אימייל',
    password: 'סיסמה',
    fullName: 'שם מלא',
    emailPlaceholder: 'student@email.com',
    teacherEmailPlaceholder: 'teacher@school.il',
    passwordPlaceholder: '••••••••',
    namePlaceholder: 'ישראל ישראלי',
    teacherNamePlaceholder: 'גב׳ כהן',
    loading: 'טוען...',
    errorOccurred: 'אירעה שגיאה. אנא נסה שוב.',
    nameRequired: 'אנא הזן את שמך',
    passwordTooShort: 'הסיסמה חייבת להכיל לפחות 6 תווים',
    invalidEmail: 'אנא הזן כתובת אימייל תקינה',

    // Toggle between login/signup
    noAccount: 'אין לך חשבון? הירשם',
    hasAccount: 'יש לך כבר חשבון? התחבר',
    oldTeacherLogin: 'כניסת מורים ישנה →',

    // Student Dashboard
    studentDashboard: 'לוח תלמיד',
    welcome: 'שלום',
    myClasses: 'הכיתות שלי',
    myAssignments: 'המטלות שלי',
    practiceMode: 'מצב תרגול',
    signOut: 'התנתק',
    joinClass: '+ הצטרף לכיתה',
    joinYourFirstClass: 'הצטרף לכיתה הראשונה שלך',
    noClasses: 'עדיין לא הצטרפת לאף כיתה.',
    noAssignments: 'אין מטלות עדיין. ביקר שוב בקרוב!',
    joinClassFirst: 'הצטרף תחילה לכיתה כדי לראות מטלות.',
    grade: 'כיתה',
    classCode: 'קוד',

    // Class Join
    joinClassTitle: 'הצטרף לכיתה',
    joinClassDescription: 'הזן את קוד הכיתה שקיבלת מהמורה שלך.',
    enterClassCode: 'הזן קוד כיתה',
    classCodePlaceholder: 'למשל, ABC123',
    joinButton: 'הצטרף לכיתה',
    invalidClassCode: 'אנא הזן קוד כיתה תקין בן 6 תווים',
    classNotFound: 'הכיתה לא נמצאה. אנא בדוק את הקוד ונסה שוב.',
    alreadyEnrolled: 'אתה כבר רשום לכיתה זו.',
    classJoinedSuccess: 'הצטרפת לכיתה בהצלחה!',

    // Assignments
    assignmentNotStarted: 'טרם התחיל',
    assignmentInProgress: 'בתהליך',
    assignmentCompleted: 'הושלם',
    assignmentOverdue: 'מאוחר',
    words: 'מילים',
    wordsLearned: 'מילים נלמדו',
    due: 'תאריך יעד',
    startAssignment: 'התחל',
    reviewAssignment: 'סקור',
    totalWords: 'סה״כ מילים',
    chooseStudyMode: 'בחר מצב לימוד',

    // Study Modes
    flashcardsMode: 'כרטיסיות',
    flashcardsDescription: 'הפוך כרטיסיות כדי ללמוד כל מילה. סמן כידוע/לא ידוע למעקב התקדמות.',
    quizMode: 'מצב חידון',
    quizModeDescription: 'בדוק את הידע שלך עם שאלות בריבוי בחירות.',

    // Flashcard UI
    yourProgress: 'ההתקדמות שלך',
    tapToReveal: 'הקש כדי לחשוף את התרגום',
    stillLearning: 'עדיין לומד',
    gotIt: 'הבנתי!',
    sessionComplete: 'הפעולה הושלמה!',
    sessionCompleteMessage: 'למדת {count} מילים. המשך לתרגל מדי יום כדי לשלוט באוצר המילים!',
    continue: 'המשך',
    example: 'דוגמה:',

    // Status Labels
    statusNew: 'חדש',
    statusLearning: 'בלימוד',
    statusReview: 'לחזרה',
    statusMastered: 'מושלט',

    // Teacher Dashboard
    teacherDashboard: 'לוח מורה',
    welcomeTeacher: 'שלום',
    myClassesTeacher: 'הכיתות שלי',
    createClass: '+ צור כיתה',
    createClassDescription: 'צור כיתה חדשה ושתף את הקוד עם התלמידים שלך.',
    noClassesTeacher: 'עדיין לא יצרת אף כיתה.',
    createFirstClass: 'צור את הכיתה הראשונה שלך',

    // Create Class
    createClassTitle: 'צור כיתה חדשה',
    className: 'שם הכיתה',
    classNamePlaceholder: 'למשל, כיתה א׳ - אנגלית',
    gradeLevel: 'רמת כיתה',
    selectGrade: 'בחר רמה',
    grade7: 'כיתה ז׳',
    grade8: 'כיתה ח׳',
    grade9: 'כיתה ט׳',
    other: 'אחר',
    classCreated: 'הכיתה נוצרה בהצלחה!',
    classCodeShare: 'שתף קוד זה עם התלמידים שלך:',

    // Assignments Management
    assignments: 'מטלות',
    createAssignment: '+ צור מטלה',
    noAssignmentsTeacher: 'עדיין לא יצרת אף מטלה.',
    createFirstAssignment: 'צור את המטלה הראשונה שלך',
    viewResults: 'תוצאות',
    editAssignment: 'ערוך',
    deleteAssignment: 'מחק',

    // Create Assignment
    createAssignmentTitle: 'צור מטלה חדשה',
    assignmentTitle: 'כותרת המטלה',
    assignmentTitlePlaceholder: 'למשל, אוצר מילים - יחידה 1',
    description: 'תיאור',
    descriptionPlaceholder: 'הוראות אופציונליות לתלמידים...',
    selectClass: 'בחר כיתה',
    selectWords: 'בחר מילים',
    numWords: 'מספר מילים',
    numWordsPlaceholder: 'למשל, 20',
    deadline: 'תאריך יעד',
    selectDeadline: 'בחר תאריך יעד',
    assignmentCreated: 'המטלה נוצרה בהצלחה!',

    // Word Selection
    selectWordsTitle: 'בחר מילים למטלה',
    selectWordsDescription: 'בחר את מילות האוצר לכלול במטלה זו.',
    filterByCategory: 'סנן לפי קטגוריה',
    filterByType: 'סנן לפי סוג',
    allCategories: 'כל הקטגוריות',
    allTypes: 'כל הסוגים',
    searchWords: 'חפש מילים...',
    selected: 'נבחר',
    saveSelection: 'שמור בחירה',

    // Assignment Results
    assignmentResults: 'תוצאות מטלה',
    studentProgress: 'התקדמות תלמידים',
    totalStudents: 'סה״כ תלמידים',
    completionRate: 'אחוז השלמה',
    inProgress: 'בתהליך',
    avgQuizScore: 'ציון ממוצע בחידון',
    noStudentsAssigned: 'אף תלמיד לא קיבל עדיין מטלה זו.',
    lastActivity: 'פעילות אחרונה',
    score: 'ציון',

    // Voice Settings
    voiceSettings: 'הגדרות קול',
    voice: 'קול',

    // Navigation
    back: 'חזור',
    home: 'בית',

    // Common
    save: 'שמור',
    cancel: 'בטל',
    delete: 'מחק',
    edit: 'ערוך',
    close: 'סגור',
    submit: 'שלח',
    or: 'או',

    // Errors
    error: 'שגיאה',
    required: 'נדרש',
  },

  ar: {
    // App Header
    appTitle: 'المفردات - المستوى الثاني',
    appSubtitle: 'منصة تعليم المنهج الإنجليزي الإسرائيلي',

    // Language Switcher
    selectLanguage: 'اختر اللغة',
    languageEnglish: 'English',
    languageHebrew: 'עברית',
    languageArabic: 'العربية',

    // Roles
    roleStudent: 'طالب',
    roleTeacher: 'معلم',

    // Auth - Login/Signup
    signIn: 'تسجيل الدخول',
    signUp: 'إنشاء حساب',
    loginTitle: 'دخول الطالب',
    teacherLogin: 'دخول المعلم',
    createTeacherAccount: 'إنشاء حساب معلم',
    createStudentAccount: 'إنشاء حساب طالب',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    fullName: 'الاسم الكامل',
    emailPlaceholder: 'student@email.com',
    teacherEmailPlaceholder: 'teacher@school.il',
    passwordPlaceholder: '••••••••',
    namePlaceholder: 'محمد أحمد',
    teacherNamePlaceholder: 'أ. محمد',
    loading: 'جاري التحميل...',
    errorOccurred: 'حدث خطأ. يرجى المحاولة مرة أخرى.',
    nameRequired: 'يرجى إدخال اسمك',
    passwordTooShort: 'يجب أن تكون كلمة المرور 6 أحرف على الأقل',
    invalidEmail: 'يرجى إدخال عنوان بريد إلكتروني صحيح',

    // Toggle between login/signup
    noAccount: 'ليس لديك حساب؟ سجل',
    hasAccount: 'لديك حساب بالفعل؟ سجل الدخول',
    oldTeacherLogin: 'دخول المعلمين القديم ←',

    // Student Dashboard
    studentDashboard: 'لوحة تحكم الطالب',
    welcome: 'مرحباً',
    myClasses: 'فصولي',
    myAssignments: 'مهامي',
    practiceMode: 'وضع التمرين',
    signOut: 'تسجيل الخروج',
    joinClass: '+ انضم للفصل',
    joinYourFirstClass: 'انضم إلى أول فصل لك',
    noClasses: 'لم تنضم إلى أي فصل بعد.',
    noAssignments: 'لا توجد مهام بعد. عد قريباً!',
    joinClassFirst: 'انضم إلى فصل أولاً لرؤية المهام.',
    grade: 'الصف',
    classCode: 'الكود',

    // Class Join
    joinClassTitle: 'انضم إلى فصل',
    joinClassDescription: 'أدخل رمز الفصل الذي قدمه معلمك للانضمام إلى فصله.',
    enterClassCode: 'أدخل رمز الفصل',
    classCodePlaceholder: 'مثال: ABC123',
    joinButton: 'انضم للفصل',
    invalidClassCode: 'يرجى إدخال رمز فصل صحيح مكون من 6 أحرف',
    classNotFound: 'الفصل غير موجود. يرجى التحقق من الرمز والمحاولة مرة أخرى.',
    alreadyEnrolled: 'أنت مسجل بالفعل في هذا الفصل.',
    classJoinedSuccess: 'تم الانضمام إلى الفصل بنجاح!',

    // Assignments
    assignmentNotStarted: 'لم يبدأ',
    assignmentInProgress: 'قيد التنفيذ',
    assignmentCompleted: 'مكتمل',
    assignmentOverdue: 'متأخر',
    words: 'كلمات',
    wordsLearned: 'كلمات متعلمة',
    due: 'تاريخ الاستحقاق',
    startAssignment: 'ابدأ',
    reviewAssignment: 'مراجعة',
    totalWords: 'إجمالي الكلمات',
    chooseStudyMode: 'اختر وضع الدراسة',

    // Study Modes
    flashcardsMode: 'البطاقات التعليمية',
    flashcardsDescription: 'اقلب البطاقات لتعلم كل كلمة. ضع علامة معروف/غير معروف لتتبع التقدم.',
    quizMode: 'وضع الاختبار',
    quizModeDescription: 'اختبر معرفتك بأسئلة متعددة الخيارات.',

    // Flashcard UI
    yourProgress: 'تقدمك',
    tapToReveal: 'اضغط للكشف عن الترجمة',
    stillLearning: 'لا يزال يتعلم',
    gotIt: 'فهمت!',
    sessionComplete: 'اكتملت الجلسة!',
    sessionCompleteMessage: 'راجعت {count} كلمات. استمر في التدريب يوميًا لإتقان المفردات!',
    continue: 'متابعة',
    example: 'مثال:',

    // Status Labels
    statusNew: 'جديد',
    statusLearning: 'يتعلم',
    statusReview: 'مراجعة',
    statusMastered: 'متقن',

    // Teacher Dashboard
    teacherDashboard: 'لوحة تحكم المعلم',
    welcomeTeacher: 'مرحباً',
    myClassesTeacher: 'فصولي',
    createClass: '+ إنشاء فصل',
    createClassDescription: 'إنشاء فصل جديد ومشاركة الرمز مع طلابك.',
    noClassesTeacher: 'لم تنشئ أي فصل بعد.',
    createFirstClass: 'أنشئ أول فصل لك',

    // Create Class
    createClassTitle: 'إنشاء فصل جديد',
    className: 'اسم الفصل',
    classNamePlaceholder: 'مثال: اللغة الإنجليزية - الصف السابع',
    gradeLevel: 'مستوى الصف',
    selectGrade: 'اختر المستوى',
    grade7: 'الصف السابع',
    grade8: 'الصف الثامن',
    grade9: 'الصف التاسع',
    other: 'آخر',
    classCreated: 'تم إنشاء الفصل بنجاح!',
    classCodeShare: 'شارك هذا الرمز مع طلابك:',

    // Assignments Management
    assignments: 'المهام',
    createAssignment: '+ إنشاء مهمة',
    noAssignmentsTeacher: 'لم تنشئ أي مهمة بعد.',
    createFirstAssignment: 'أنشئ أول مهمة لك',
    viewResults: 'النتائج',
    editAssignment: 'تعديل',
    deleteAssignment: 'حذف',

    // Create Assignment
    createAssignmentTitle: 'إنشاء مهمة جديدة',
    assignmentTitle: 'عنوان المهمة',
    assignmentTitlePlaceholder: 'مثال: مفردات الوحدة 1',
    description: 'الوصف',
    descriptionPlaceholder: 'تعليمات اختيارية للطلاب...',
    selectClass: 'اختر الفصل',
    selectWords: 'اختر الكلمات',
    numWords: 'عدد الكلمات',
    numWordsPlaceholder: 'مثال: 20',
    deadline: 'تاريخ الاستحقاق',
    selectDeadline: 'اختر تاريخ الاستحقاق',
    assignmentCreated: 'تم إنشاء المهمة بنجاح!',

    // Word Selection
    selectWordsTitle: 'اختر الكلمات للمهمة',
    selectWordsDescription: 'اختر كلمات المفردات لتضمينها في هذه المهمة.',
    filterByCategory: 'تصفية حسب الفئة',
    filterByType: 'تصفية حسب النوع',
    allCategories: 'جميع الفئات',
    allTypes: 'جميع الأنواع',
    searchWords: 'البحث عن الكلمات...',
    selected: 'محدد',
    saveSelection: 'حفظ الاختيار',

    // Assignment Results
    assignmentResults: 'نتائج المهمة',
    studentProgress: 'تقدم الطلاب',
    totalStudents: 'إجمالي الطلاب',
    completionRate: 'معدل الإكمال',
    inProgress: 'قيد التنفيذ',
    avgQuizScore: 'متوسط درجة الاختبار',
    noStudentsAssigned: 'لم يتم تعيين هذه المهمة لأي طالب بعد.',
    lastActivity: 'آخر نشاط',
    score: 'الدرجة',

    // Voice Settings
    voiceSettings: 'إعدادات الصوت',
    voice: 'الصوت',

    // Navigation
    back: 'رجوع',
    home: 'الرئيسية',

    // Common
    save: 'حفظ',
    cancel: 'إلغاء',
    delete: 'حذف',
    edit: 'تعديل',
    close: 'إغلاق',
    submit: 'إرسال',
    or: 'أو',

    // Errors
    error: 'خطأ',
    required: 'مطلوب',
  },
};
