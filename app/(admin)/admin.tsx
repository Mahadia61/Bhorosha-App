import { TeacherProfileEditor } from "@/components/admin/TeacherManagement";
import { useCallback, useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Redirect, router, useFocusEffect } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { Button, Card, Empty, Stars } from "@/components/ui/ui";
import { services } from "@/lib/services/services";
import { useApp } from "@/providers/AppProvider";
import { academicLabel } from "@/lib/utils/academic";
import type {
  AppNotification,
  Course,
  CourseQuestion,
  CourseStatus,
  ModerationAppeal,
  ModerationHistoryItem,
  ProfessorReview,
  Profile,
  Report,
  Review,
  TeacherProfile,
} from "@/lib/types/types";

type AdminView =
  "overview" | "courses" | "members" | "moderation" | "analytics";
type ModerationSection =
  "reports" | "questions" | "responses" | "appeals" | "history";
type AdminData = {
  courses: Course[];
  users: Profile[];
  teacherProfiles: TeacherProfile[];
  reviews: Review[];
  professorReviews: ProfessorReview[];
  questions: CourseQuestion[];
  reports: Report[];
  notifications: AppNotification[];
  appeals: ModerationAppeal[];
  history: ModerationHistoryItem[];
};

const emptyAdminData: AdminData = {
  courses: [],
  users: [],
  teacherProfiles: [],
  reviews: [],
  professorReviews: [],
  questions: [],
  reports: [],
  notifications: [],
  appeals: [],
  history: [],
};

export default function AdminWorkspace({
  initialView,
}: {
  initialView?: AdminView;
}) {
  const { profile } = useApp();
  const [view, setView] = useState<AdminView>(initialView ?? "overview");
  const [data, setData] = useState<AdminData>(emptyAdminData);
  const [query, setQuery] = useState("");
  const [courseQuery, setCourseQuery] = useState("");
  const [courseDepartment, setCourseDepartment] = useState("all");
  const [courseLevel, setCourseLevel] = useState<"all" | "1" | "2" | "3" | "4">(
    "all",
  );
  const [courseTerm, setCourseTerm] = useState<"all" | "1" | "2">("all");
  const [courseStatus, setCourseStatus] = useState<
    "all" | "active" | "archived" | "draft"
  >("all");
  const [courseFilterOpen, setCourseFilterOpen] = useState(false);
  const [draftCourseDepartment, setDraftCourseDepartment] = useState("all");
  const [draftCourseLevel, setDraftCourseLevel] = useState<
    "all" | "1" | "2" | "3" | "4"
  >("all");
  const [draftCourseTerm, setDraftCourseTerm] = useState<"all" | "1" | "2">(
    "all",
  );
  const [draftCourseStatus, setDraftCourseStatus] = useState<
    "all" | "active" | "archived" | "draft"
  >("all");
  const [memberRole, setMemberRole] = useState<
    "all" | "student" | "teacher" | "suspended" | "pending"
  >("all");
  const [teacherEditorOpen, setTeacherEditorOpen] = useState(false);
  const [moderationSection, setModerationSection] =
    useState<ModerationSection>("reports");
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [
        courses,
        users,
        teacherProfiles,
        reviews,
        professorReviews,
        questions,
        reports,
        notifications,
        appeals,
        history,
      ] = await Promise.all([
        services.courses(),
        services.adminUsers(),
        services.teacherProfiles(),
        services.allReviews(),
        services.allProfessorReviews(),
        services.allCourseQuestions(),
        services.allReports(),
        services.adminNotifications(),
        services.appeals(),
        services.moderationHistory(),
      ]);
      setData({
        courses,
        users,
        teacherProfiles,
        reviews,
        professorReviews,
        questions,
        reports,
        notifications,
        appeals,
        history,
      });
    } catch (reason) {
      setData(emptyAdminData);
      setLoadError(
        reason instanceof Error
          ? reason.message
          : "Unable to load the admin workspace.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  useEffect(() => {
    if (profile?.role !== "admin") return;
    const handleRealtimeError = (reason: Error) => setLoadError(reason.message);
    const unsubscribeReports = services.subscribeAllReports(
      (reports) => setData((current) => ({ ...current, reports })),
      handleRealtimeError,
    );
    const unsubscribeNotifications = services.subscribeAdminNotifications(
      (notifications) => setData((current) => ({ ...current, notifications })),
      handleRealtimeError,
    );
    return () => {
      unsubscribeReports();
      unsubscribeNotifications();
    };
  }, [profile?.role]);
  useEffect(() => {
    if (initialView) setView(initialView);
  }, [initialView]);

  if (!profile) return <Redirect href="/welcome" />;
  if (profile.role !== "admin") return <Redirect href="/" />;

  const removeCourse = (course: Course) => {
    Alert.alert(
      "Archive course?",
      `${course.code} will no longer appear as active. Its reviews and history will be preserved.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => {
            void services
              .archiveCourse(course)
              .then(() => {
                setData((current) => ({
                  ...current,
                  courses: current.courses.map((item) =>
                    item.id === course.id
                      ? { ...item, status: "archived" }
                      : item,
                  ),
                }));
                Alert.alert(
                  "Course archived",
                  `${course.code} is archived and its history is preserved.`,
                );
              })
              .catch((reason) =>
                Alert.alert(
                  "Could not archive course",
                  reason instanceof Error
                    ? reason.message
                    : "Please try again.",
                ),
              );
          },
        },
      ],
    );
  };

  const changeStatus = (user: Profile) =>
    Alert.alert("Suspend student account?", user.name, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Suspend",
        style: "destructive",
        onPress: () => {
          void services
            .updateUserStatus(user, false)
            .then(load)
            .catch((reason) =>
              Alert.alert(
                "Could not suspend student",
                reason instanceof Error ? reason.message : "Please try again.",
              ),
            );
        },
      },
    ]);

  const averageRating = data.reviews.length
    ? data.reviews.reduce(
        (sum, review) =>
          sum +
          Object.values(review.ratings).reduce(
            (total, rating) => total + rating,
            0,
          ) /
            Object.values(review.ratings).length,
        0,
      ) / data.reviews.length
    : 0;
  const courseAnalytics = data.courses
    .map((course) => {
      const reviews = data.reviews.filter(
        (review) => review.courseId === course.id,
      );
      const average = reviews.length
        ? reviews.reduce(
            (sum, review) =>
              sum +
              Object.values(review.ratings).reduce(
                (total, rating) => total + rating,
                0,
              ) /
                Object.values(review.ratings).length,
            0,
          ) / reviews.length
        : 0;
      return { course, count: reviews.length, average };
    })
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.course.code.localeCompare(right.course.code),
    );
  const teacherAnalytics = data.users
    .filter((user) => user.role === "teacher")
    .map((teacher) => {
      const reviews = data.professorReviews.filter(
        (review) => review.professorId === teacher.id,
      );
      const average = reviews.length
        ? reviews.reduce((sum, review) => sum + review.rating, 0) /
          reviews.length
        : 0;
      return {
        teacher,
        count: reviews.length,
        average,
        courseCount: data.courses.filter((course) =>
          course.teacherIds.includes(teacher.id),
        ).length,
      };
    })
    .sort(
      (left, right) =>
        right.count - left.count ||
        left.teacher.name.localeCompare(right.teacher.name),
    );
  const reviewMetricAverage = (key: keyof Review["ratings"]) =>
    data.reviews.length
      ? data.reviews.reduce((sum, review) => sum + review.ratings[key], 0) /
        data.reviews.length
      : 0;
  const departmentInsights = data.users.reduce<Record<string, number>>(
    (counts, user) => {
      counts[user.department] = (counts[user.department] ?? 0) + 1;
      return counts;
    },
    {},
  );
  const topDepartments = Object.entries(departmentInsights)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3);
  const analyticsMonthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const nextMonth = new Date(date);
    nextMonth.setMonth(date.getMonth() + 1);
    return {
      label: date.toLocaleDateString(undefined, { month: "short" }),
      users: data.users.filter(
        (user) =>
          (user.createdAt ?? 0) >= date.getTime() &&
          (user.createdAt ?? 0) < nextMonth.getTime(),
      ).length,
      reviews: data.reviews.filter(
        (review) =>
          review.createdAt >= date.getTime() &&
          review.createdAt < nextMonth.getTime(),
      ).length,
    };
  });
  const userDistribution = [
    {
      label: "Students",
      value: data.users.filter((user) => user.role === "student").length,
      color: "bg-brand",
    },
    {
      label: "Teachers",
      value: data.users.filter((user) => user.role === "teacher").length,
      color: "bg-emerald-500",
    },
    {
      label: "Admins",
      value: data.users.filter((user) => user.role === "admin").length,
      color: "bg-amber-500",
    },
  ];
  const ratingDistribution = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: data.reviews.filter(
      (review) =>
        Math.round(
          Object.values(review.ratings).reduce((sum, value) => sum + value, 0) /
            Object.values(review.ratings).length,
        ) === rating,
    ).length,
  }));
  const anonymousReviewCount = data.reviews.filter(
    (review) => review.anonymous,
  ).length;
  const namedReviewCount = data.reviews.length - anonymousReviewCount;
  const answeredQuestionCount = data.questions.filter(
    (question) => (question.answers?.length ?? 0) > 0,
  ).length;
  const unansweredQuestionCount = data.questions.length - answeredQuestionCount;
  const pendingReportCount = data.reports.filter(
    (report) => report.status === "pending",
  ).length;
  const resolvedReportCount = data.reports.filter(
    (report) => report.status !== "pending",
  ).length;
  const pendingStudentVerificationCount = data.users.filter(
    (user) => user.role === "student" && user.emailVerified === false,
  ).length;
  const pendingQuestionCount = unansweredQuestionCount;
  const activeStudentCount = data.users.filter(
    (user) => user.role === "student" && user.active !== false,
  ).length;
  const activeTeacherCount = data.users.filter(
    (user) => user.role === "teacher" && user.active !== false,
  ).length;
  const filteredCourses = data.courses.filter((course) => {
    const textMatches = `${course.code} ${course.title} ${course.department}`
      .toLowerCase()
      .includes(courseQuery.toLowerCase());
    return (
      textMatches &&
      (courseDepartment === "all" || course.department === courseDepartment) &&
      (courseLevel === "all" || course.level === courseLevel) &&
      (courseTerm === "all" || course.term === courseTerm) &&
      (courseStatus === "all" || (course.status ?? "active") === courseStatus)
    );
  });
  const studentMembers = data.users.filter(
    (user) =>
      user.role === "student" &&
      `${user.name} ${user.email} ${user.department}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const profiledTeachers = data.teacherProfiles
    .filter((teacher) =>
      `${teacher.name} ${teacher.email} ${teacher.department}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .map((teacher) => ({
      teacher,
      account:
        data.users.find(
          (user) =>
            user.id === teacher.linkedUserId ||
            user.teacherProfileId === teacher.id,
        ) ?? null,
    }));
  const linkedTeacherAccountIds = new Set(
    profiledTeachers.flatMap((item) => (item.account ? [item.account.id] : [])),
  );
  const teacherMembers = [
    ...profiledTeachers,
    ...data.users
      .filter(
        (user) =>
          user.role === "teacher" &&
          !linkedTeacherAccountIds.has(user.id) &&
          `${user.name} ${user.email} ${user.department}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      )
      .map((user) => ({
        teacher: {
          id: user.id,
          name: user.name,
          department: user.department,
          designation: user.designation ?? "Lecturer",
          email: user.email,
          linkedUserId: user.id,
        },
        account: user,
      })),
  ].sort((left, right) => left.teacher.name.localeCompare(right.teacher.name));
  const openCourseFilters = () => {
    setDraftCourseDepartment(courseDepartment);
    setDraftCourseLevel(courseLevel);
    setDraftCourseTerm(courseTerm);
    setDraftCourseStatus(courseStatus);
    setCourseFilterOpen(true);
  };
  const applyCourseFilters = () => {
    setCourseDepartment(draftCourseDepartment);
    setCourseLevel(draftCourseLevel);
    setCourseTerm(draftCourseTerm);
    setCourseStatus(draftCourseStatus);
    setCourseFilterOpen(false);
  };
  const recentActivity = [
    ...data.reviews.map((review) => ({
      label: "New course review",
      time: review.createdAt,
    })),
    ...data.questions.map((question) => ({
      label: "New course question",
      time: question.createdAt,
    })),
    ...data.reports.map((report) => ({
      label: "New moderation report",
      time: report.createdAt,
    })),
  ]
    .sort((left, right) => right.time - left.time)
    .slice(0, 5);
  const activityDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    const reviews = data.reviews.filter(
      (review) =>
        review.createdAt >= date.getTime() &&
        review.createdAt < nextDate.getTime(),
    ).length;
    const questions = data.questions.filter(
      (question) =>
        question.createdAt >= date.getTime() &&
        question.createdAt < nextDate.getTime(),
    ).length;
    const answers = data.questions.reduce(
      (total, question) =>
        total +
        (question.answers ?? []).filter(
          (answer) =>
            answer.createdAt >= date.getTime() &&
            answer.createdAt < nextDate.getTime(),
        ).length,
      0,
    );
    return {
      label: date.toLocaleDateString(undefined, { weekday: "short" }),
      reviews,
      questions,
      answers,
    };
  });
  const averagePlatformRating = data.reviews.length
    ? data.reviews.reduce(
        (sum, review) =>
          sum +
          Object.values(review.ratings).reduce(
            (total, rating) => total + rating,
            0,
          ) /
            Object.values(review.ratings).length,
        0,
      ) / data.reviews.length
    : 0;
  const verifiedUserPercentage = data.users.length
    ? `${Math.round((data.users.filter((user) => user.emailVerified !== false).length / data.users.length) * 100)}%`
    : "No data yet";
  const recentAdminActivity = data.history
    .slice(0, 3)
    .map((item) => ({ label: item.summary, time: item.createdAt }));
  const recentCommunityActivity = [
    ...data.reviews.map((review) => ({
      label: "New review submitted",
      detail:
        data.courses.find((course) => course.id === review.courseId)?.code ??
        "Course review",
      time: review.createdAt,
    })),
    ...data.questions.map((question) => ({
      label: "New course question",
      detail:
        data.courses.find((course) => course.id === question.courseId)?.code ??
        "Course question",
      time: question.createdAt,
    })),
  ];
  const recentActivityItems = [
    ...recentAdminActivity.map((item) => ({ ...item, detail: "" })),
    ...recentCommunityActivity,
  ]
    .sort((left, right) => right.time - left.time)
    .slice(0, 5);
  if (!loading && !loadError && view === "overview")
    return (
      <AdminOverviewReferencePage
        data={data}
        profile={profile}
        onSelect={(next) => setView(next)}
      />
    );
  if (!loading && !loadError && view === "courses")
    return (
      <AdminCoursesPage
        courses={data.courses}
        profile={profile}
        onSelect={(next) => setView(next)}
        onRefresh={load}
      />
    );
  if (!loading && !loadError && view === "members")
    return (
      <AdminMembersPage
        data={data}
        profile={profile}
        onSelect={(next) => setView(next)}
        selectedMember={selectedMember}
        onSelectMember={(member) => setSelectedMember(member)}
        onCloseMember={() => setSelectedMember(null)}
      />
    );
  if (!loading && !loadError && view === "moderation")
    return (
      <AdminModerationPage
        data={data}
        profile={profile}
        onSelect={(next) => setView(next)}
        onRefresh={load}
      />
    );
  if (!loading && !loadError && view === "analytics")
    return (
      <AdminAnalyticsPage
        data={data}
        profile={profile}
        onSelect={(next) => setView(next)}
      />
    );
  if (loading)
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="px-5 pt-5">
          <Title
            title="Loading workspace"
            text="Fetching courses, members, and moderation data."
          />
          <Empty title="Loading…" body="Please wait a moment." />
        </View>
      </SafeAreaView>
    );
  if (loadError)
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 bg-slate-50 dark:bg-slate-950">
        <View className="px-5 pt-5">
          <Title
            title="Workspace unavailable"
            text="The platform data could not be loaded."
          />
          <Empty title="Could not load data" body={loadError} />
          <Button
            className="mt-2"
            variant="outline"
            onPress={() => {
              void load();
            }}
          >
            Try again
          </Button>
        </View>
      </SafeAreaView>
    );
  return null;
}

function AdminOverviewReferencePage({
  data,
  profile,
  onSelect,
}: {
  data: AdminData;
  profile: Profile;
  onSelect: (view: AdminView) => void;
}) {
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const students = data.users.filter((user) => user.role === "student");
  const teachers = data.users.filter((user) => user.role === "teacher");
  const reports = data.reports.filter((report) => report.status === "pending");
  const periodReviews = data.reviews.filter((review) =>
    isInPeriod(review.createdAt, period),
  );
  const periodReports = reports.filter((report) =>
    isInPeriod(report.createdAt, period),
  );
  const pending = students.filter((user) => user.emailVerified === false);
  const unlinkedTeachers = data.teacherProfiles.filter(
    (teacher) => !teacher.linkedUserId,
  );
  const activeCourses = data.courses
    .filter((course) => (course.status ?? "active") === "active")
    .slice(0, 3);
  const recent = [
    ...data.reviews.map((item) => ({
      id: item.id,
      icon: "star" as const,
      title: "New review submitted",
      detail:
        data.courses.find((course) => course.id === item.courseId)?.code ??
        "Course review",
      createdAt: item.createdAt,
    })),
    ...data.questions.map((item) => ({
      id: item.id,
      icon: "book-open" as const,
      title: "New question submitted",
      detail:
        data.courses.find((course) => course.id === item.courseId)?.code ??
        "Course question",
      createdAt: item.createdAt,
    })),
  ]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 3);
  const memberTotal = Math.max(1, students.length + teachers.length);
  const date = new Date().toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 bg-[#F6F7F9] dark:bg-slate-950">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 20, paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-[27px] font-extrabold tracking-tight text-[#10182F]">
              Bhorosha <Text className="text-[#0B6BFF]">Admin</Text>
            </Text>
            <Text className="mt-1 text-sm text-[#63718B]">
              Empowering better learning together.
            </Text>
          </View>
        </View>

        <View className="mt-7 h-44 overflow-hidden rounded-3xl bg-[#DDEBFF] px-6 py-6">
          <View className="absolute -bottom-12 -right-7 h-44 w-60 rounded-tl-[120px] bg-[#C8DEFF]" />
          <View className="absolute bottom-0 right-0 h-24 w-44 rounded-tl-[100px] bg-[#B8D4FF]" />
          <Text className="text-[22px] font-extrabold text-[#10182F]">
            Welcome back!
          </Text>
          <Text className="mt-2 max-w-[62%] text-sm leading-5 text-[#40536E]">
            Manage your platform, support learning and make an impact.
          </Text>
          <View className="mt-5 flex-row items-center gap-2">
            <Feather name="calendar" size={16} color="#536984" />
            <Text className="text-sm text-[#536984]">{date}</Text>
          </View>
          <View className="absolute bottom-7 right-10">
            <MaterialCommunityIcons
              name="school-outline"
              size={70}
              color="#0B6BFF"
            />
          </View>
        </View>

        <View className="mt-7">
          <View className="mb-3 flex-row items-center justify-between">
            <Text className="text-[21px] font-extrabold text-[#10182F]">
              Key statistics
            </Text>
            <PeriodPicker value={period} onChange={setPeriod} />
          </View>
          <View className="flex-row flex-wrap gap-3">
            <ReferenceStat
              icon="book-open"
              iconBg="#E5F0FF"
              color="#0B6BFF"
              value={data.courses.length}
              label="Courses"
            />
            <ReferenceStat
              icon="users"
              iconBg="#E5F0FF"
              color="#0B6BFF"
              value={data.users.filter((user) => user.active !== false).length}
              label="Active users"
            />
            <ReferenceStat
              icon="star"
              iconBg="#FFF1D7"
              color="#F4AC19"
              value={periodReviews.length}
              label="Total reviews"
            />
            <ReferenceStat
              icon="flag"
              iconBg="#FFE4E6"
              color="#FB4251"
              value={periodReports.length}
              label="Reports"
            />
          </View>
        </View>

        <ReferenceSection
          title="User distribution"
          action="View all"
          onAction={() => onSelect("members")}
        >
          <View className="rounded-2xl border border-[#E7EAF0] bg-white p-4">
            <View className="h-5 flex-row overflow-hidden rounded-full bg-[#E7ECF6]">
              <View
                className="h-full bg-[#0B6BFF]"
                style={{ width: `${(students.length / memberTotal) * 100}%` }}
              />
              <View
                className="h-full bg-[#9DC5FF]"
                style={{ width: `${(teachers.length / memberTotal) * 100}%` }}
              />
            </View>
            <View className="mt-4 flex-row justify-between">
              <ReferenceDistribution
                color="#0B6BFF"
                label="Students"
                value={students.length}
                total={memberTotal}
              />
              <ReferenceDistribution
                color="#8DBBFF"
                label="Teachers"
                value={teachers.length}
                total={memberTotal}
              />
              <ReferenceDistribution
                color="#DCE4F4"
                label="Others"
                value={0}
                total={memberTotal}
              />
            </View>
          </View>
        </ReferenceSection>

        <ReferenceSection
          title="Ongoing tasks"
          action="View all"
          onAction={() => onSelect(reports.length ? "moderation" : "members")}
        >
          <ReferenceList>
            {reports.length ? (
              <ReferenceRow
                icon="flag"
                bg="#FFE6E8"
                color="#F04455"
                title={`${reports.length} reported item${reports.length === 1 ? "" : "s"}`}
                detail="Require moderation"
                onPress={() => onSelect("moderation")}
              />
            ) : null}
            {pending.length ? (
              <ReferenceRow
                icon="mail"
                bg="#FFF2D8"
                color="#F5A623"
                title={`${pending.length} student verification${pending.length === 1 ? "" : "s"}`}
                detail="Pending approval"
                onPress={() => onSelect("members")}
              />
            ) : null}
            {unlinkedTeachers.length ? (
              <ReferenceRow
                icon="user-plus"
                bg="#E5F0FF"
                color="#0B6BFF"
                title={`${unlinkedTeachers.length} teacher profile${unlinkedTeachers.length === 1 ? "" : "s"}`}
                detail="Not linked to an account"
                onPress={() => onSelect("members")}
              />
            ) : null}
            {!reports.length && !pending.length && !unlinkedTeachers.length ? (
              <Text className="p-5 text-sm text-[#64718B]">
                No tasks require attention right now.
              </Text>
            ) : null}
          </ReferenceList>
        </ReferenceSection>

        <ReferenceSection
          title="Active courses"
          action="View all"
          onAction={() => onSelect("courses")}
        >
          <ReferenceList>
            {activeCourses.length ? (
              activeCourses.map((course, index) => (
                <ReferenceRow
                  key={course.id}
                  icon="book-open"
                  bg={
                    index === 1
                      ? "#EEE8FF"
                      : index === 2
                        ? "#E3F9EE"
                        : "#E5F0FF"
                  }
                  color={
                    index === 1
                      ? "#7540EB"
                      : index === 2
                        ? "#0D9A57"
                        : "#0B6BFF"
                  }
                  title={course.title}
                  detail={`${course.code} | ${course.department}`}
                  status="Active"
                  onPress={() =>
                    router.push({
                      pathname: "/admin-course-details" as never,
                      params: { courseId: course.id },
                    })
                  }
                />
              ))
            ) : (
              <Text className="p-5 text-sm text-[#64718B]">
                No active courses yet.
              </Text>
            )}
          </ReferenceList>
        </ReferenceSection>

        <ReferenceSection
          title="Recent activity"
          action="View all"
          onAction={() => router.push("/admin-activity" as never)}
        >
          <ReferenceList>
            {recent.length ? (
              recent.map((item) => (
                <ReferenceRow
                  key={item.id}
                  icon={item.icon}
                  bg="#E5F0FF"
                  color="#0B6BFF"
                  title={item.title}
                  detail={item.detail}
                  time={formatRelativeTime(item.createdAt)}
                  onPress={() => router.push("/admin-activity" as never)}
                />
              ))
            ) : (
              <Text className="p-5 text-sm text-[#64718B]">
                No recent activity yet.
              </Text>
            )}
          </ReferenceList>
        </ReferenceSection>

        <View className="mt-6 overflow-hidden rounded-3xl bg-[#ECEEFF] p-5">
          <View className="absolute -bottom-5 -left-3 opacity-80">
            <MaterialCommunityIcons
              name="account-school-outline"
              size={152}
              color="#9BC1FF"
            />
          </View>
          <View className="ml-[40%]">
            <Text className="text-lg font-extrabold text-[#10182F]">
              Together for better education
            </Text>
            <Text className="mt-2 text-sm leading-5 text-[#52627A]">
              Support student learning through transparent and constructive
              feedback.
            </Text>
            <Pressable
              onPress={() => onSelect("analytics")}
              className="mt-4 self-start rounded-xl bg-[#0B6BFF] px-4 py-3"
            >
              <Text className="text-sm font-bold text-white">
                View platform insights
              </Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
      <ReferenceAdminNav active="overview" onSelect={onSelect} />
    </SafeAreaView>
  );
}

type PeriodKey = "7d" | "30d" | "90d" | "6m" | "12m";
const periodLabels: Record<PeriodKey, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 3 months",
  "6m": "Last 6 months",
  "12m": "Last 12 months",
};
function isInPeriod(timestamp: number | undefined, period: PeriodKey) {
  if (!timestamp) return false;
  const days =
    period === "7d"
      ? 7
      : period === "30d"
        ? 30
        : period === "90d"
          ? 90
          : period === "6m"
            ? 183
            : 365;
  return timestamp >= Date.now() - days * 24 * 60 * 60 * 1000;
}
function PeriodPicker({
  value,
  onChange,
  choices = ["7d", "30d", "90d"],
}: {
  value: PeriodKey;
  onChange: (value: PeriodKey) => void;
  choices?: PeriodKey[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Pressable
        onPress={() => setOpen(true)}
        className="flex-row items-center rounded-xl bg-white px-3 py-2 dark:bg-slate-900"
      >
        <Text className="text-xs font-medium text-[#64718B] dark:text-slate-400">
          {periodLabels[value]}
        </Text>
        <Feather name="chevron-down" size={15} color="#64718B" />
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          className="flex-1 justify-end bg-black/25"
        >
          <Pressable
            onPress={() => {}}
            className="rounded-t-3xl bg-white px-5 pb-10 pt-5 dark:bg-slate-900"
          >
            <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-slate-200 dark:bg-slate-700" />
            <Text className="text-lg font-bold text-[#172038] dark:text-white">
              Choose period
            </Text>
            {choices.map((choice) => (
              <Pressable
                key={choice}
                onPress={() => {
                  onChange(choice);
                  setOpen(false);
                }}
                className={`mt-3 flex-row items-center justify-between rounded-xl px-4 py-4 ${value === choice ? "bg-[#E8F0FE] dark:bg-[#102958]" : "bg-[#F6F7F9] dark:bg-slate-800"}`}
              >
                <Text
                  className={`text-sm font-semibold ${value === choice ? "text-[#0B6BFF]" : "text-[#172038] dark:text-white"}`}
                >
                  {periodLabels[choice]}
                </Text>
                {value === choice ? (
                  <Feather name="check" size={19} color="#0B6BFF" />
                ) : null}
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
function ReferenceSection({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-7">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-[21px] font-extrabold text-[#10182F] dark:text-white">
          {title}
        </Text>
        {onAction ? (
          <Pressable onPress={onAction} hitSlop={8}>
            <Text className="text-sm font-bold text-[#0B6BFF]">{action}</Text>
          </Pressable>
        ) : (
          <View className="rounded-xl bg-white px-3 py-2 dark:bg-slate-900">
            <Text className="text-xs font-medium text-[#64718B] dark:text-slate-400">
              {action}
            </Text>
          </View>
        )}
      </View>
      {children}
    </View>
  );
}
function ReferenceStat({
  icon,
  iconBg,
  color,
  value,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View className="w-[48%] rounded-2xl border border-[#E7EAF0] bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
      <View
        style={{ backgroundColor: iconBg }}
        className="h-10 w-10 items-center justify-center rounded-xl"
      >
        <Feather name={icon} size={20} color={color} />
      </View>
      <Text className="mt-3 text-2xl font-extrabold text-[#172038] dark:text-white">
        {value}
      </Text>
      <Text
        numberOfLines={1}
        className="mt-1 text-xs text-[#64718B] dark:text-slate-400"
      >
        {label}
      </Text>
    </View>
  );
}
function ReferenceDistribution({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  return (
    <View>
      <View className="flex-row items-center gap-1.5">
        <View
          style={{ backgroundColor: color }}
          className="h-3 w-3 rounded-full"
        />
        <Text className="text-sm text-[#52627A]">{label}</Text>
      </View>
      <Text className="mt-1 text-sm font-extrabold text-[#172038]">
        {Math.round((value / total) * 100)}%{" "}
        <Text className="font-normal text-[#64718B]">({value})</Text>
      </Text>
    </View>
  );
}
function ReferenceList({ children }: { children: React.ReactNode }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-[#E7EAF0] bg-white dark:border-slate-800 dark:bg-slate-900">
      {children}
    </View>
  );
}
function ReferenceRow({
  icon,
  bg,
  color,
  title,
  detail,
  status,
  time,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  bg: string;
  color: string;
  title: string;
  detail: string;
  status?: string;
  time?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-[#EDF0F5] px-4 py-4 last:border-b-0 dark:border-slate-800"
    >
      <View
        style={{ backgroundColor: bg }}
        className="h-12 w-12 items-center justify-center rounded-xl"
      >
        <Feather name={icon} size={21} color={color} />
      </View>
      <View className="ml-4 flex-1">
        <Text className="text-base font-bold text-[#172038] dark:text-white">
          {title}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-1 text-sm text-[#64718B] dark:text-slate-400"
        >
          {detail}
        </Text>
      </View>
      {status ? (
        <View className="mr-3 rounded-full bg-[#E5F9ED] px-3 py-1.5">
          <Text className="text-xs font-bold text-[#139354]">â— {status}</Text>
        </View>
      ) : null}
      {time ? (
        <Text className="mr-3 text-xs text-[#78859A] dark:text-slate-400">
          {time}
        </Text>
      ) : null}
    </Pressable>
  );
}
function ReferenceAdminNav({
  active,
  onSelect,
}: {
  active: AdminView;
  onSelect: (view: AdminView) => void;
}) {
  const tabs: {
    id: AdminView;
    label: string;
    icon: keyof typeof Feather.glyphMap;
  }[] = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "courses", label: "Courses", icon: "book-open" },
    { id: "members", label: "Members", icon: "users" },
    { id: "moderation", label: "Moderation", icon: "shield" },
    { id: "analytics", label: "Analytics", icon: "bar-chart-2" },
  ];
  return (
    <View className="flex-row justify-around border-t border-slate-200 bg-white px-2 py-3 dark:border-slate-800 dark:bg-slate-900">
      {tabs.map((tab) => (
        <Pressable
          key={tab.id}
          onPress={() => onSelect(tab.id)}
          className="items-center gap-1 px-2"
        >
          <Feather
            name={tab.icon}
            size={21}
            color={active === tab.id ? "#1670F8" : "#64748B"}
          />
          <Text
            className={`text-[10px] font-semibold ${active === tab.id ? "text-[#1670F8]" : "text-slate-500"}`}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function AdminCoursesPage({
  courses,
  profile,
  onSelect,
  onRefresh,
}: {
  courses: Course[];
  profile: Profile;
  onSelect: (view: AdminView) => void;
  onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<"all" | CourseStatus>("all");
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [level, setLevel] = useState<"all" | "1" | "2" | "3" | "4">("all");
  const [term, setTerm] = useState<"all" | "1" | "2">("all");
  const [courseStatus, setCourseStatus] = useState<
    "all" | "active" | "archived" | "draft"
  >("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [draftDepartment, setDraftDepartment] = useState("all");
  const [draftLevel, setDraftLevel] = useState<"all" | "1" | "2" | "3" | "4">(
    "all",
  );
  const [draftTerm, setDraftTerm] = useState<"all" | "1" | "2">("all");
  const [draftCourseStatus, setDraftCourseStatus] = useState<
    "all" | "active" | "archived" | "draft"
  >("all");
  const [menuCourse, setMenuCourse] = useState<Course | null>(null);
  const departments = [
    ...new Set(courses.map((course) => course.department).filter(Boolean)),
  ];
  const visible = courses.filter(
    (course) =>
      (filter === "all" || (course.status ?? "active") === filter) &&
      (courseStatus === "all" ||
        (course.status ?? "active") === courseStatus) &&
      (department === "all" || course.department === department) &&
      (level === "all" || course.level === level) &&
      (term === "all" || course.term === term) &&
      `${course.code} ${course.title} ${course.teacherNames.join(" ")}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const openFilters = () => {
    setDraftDepartment(department);
    setDraftLevel(level);
    setDraftTerm(term);
    setDraftCourseStatus(courseStatus);
    setFilterOpen(true);
  };
  const applyFilters = () => {
    setDepartment(draftDepartment);
    setLevel(draftLevel);
    setTerm(draftTerm);
    setCourseStatus(draftCourseStatus);
    setFilter(draftCourseStatus);
    setFilterOpen(false);
  };
  const nav: {
    id: AdminView;
    label: string;
    icon: keyof typeof Feather.glyphMap;
  }[] = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "courses", label: "Courses", icon: "book-open" },
    { id: "members", label: "Members", icon: "users" },
    { id: "moderation", label: "Moderation", icon: "shield" },
    { id: "analytics", label: "Analytics", icon: "bar-chart-2" },
  ];
  const colors = [
    ["bg-blue-100", "#1670F8"],
    ["bg-violet-100", "#7C3AED"],
    ["bg-emerald-100", "#059669"],
    ["bg-rose-100", "#BE123C"],
  ];
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 bg-[#F5F6F8] dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 96 }}>
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-3xl font-bold text-slate-950">Courses</Text>
            <Text className="mt-1 text-sm text-slate-500">
              Manage all courses and their teaching assignments.
            </Text>
          </View>
        </View>
        <View className="mt-7 flex-row gap-3">
          <CourseMetric
            icon="book-open"
            iconBg="bg-blue-100"
            color="#1670F8"
            value={courses.length}
            label="Total Courses"
          />
          <CourseMetric
            icon="play-circle"
            iconBg="bg-emerald-100"
            color="#059669"
            value={
              courses.filter(
                (course) => (course.status ?? "active") === "active",
              ).length
            }
            label="Active"
          />
          <CourseMetric
            icon="archive"
            iconBg="bg-slate-100"
            color="#475569"
            value={
              courses.filter((course) => course.status === "archived").length
            }
            label="Archived"
          />
          <CourseMetric
            icon="file-text"
            iconBg="bg-amber-100"
            color="#B77900"
            value={courses.filter((course) => course.status === "draft").length}
            label="Draft"
          />
        </View>
        <CourseFilters
          query={search}
          onQuery={setSearch}
          department={draftDepartment}
          onDepartment={setDraftDepartment}
          level={draftLevel}
          onLevel={setDraftLevel}
          term={draftTerm}
          onTerm={setDraftTerm}
          status={draftCourseStatus}
          onStatus={setDraftCourseStatus}
          departments={departments}
          open={filterOpen}
          onOpen={openFilters}
          onClose={() => setFilterOpen(false)}
          onApply={applyFilters}
        />
        <View className="mt-5 flex-row items-center justify-end">
          <Pressable
            onPress={() => router.push("/admin-course-form")}
            className="flex-row items-center gap-2 rounded-xl bg-[#1670F8] px-4 py-3"
          >
            <Feather name="plus" size={19} color="white" />
            <Text className="text-sm font-semibold text-white">Add course</Text>
          </Pressable>
        </View>
        <View className="mt-5 gap-3">
          {visible.length ? (
            visible.map((course, index) => (
              <Pressable
                key={course.id}
                onPress={() =>
                  router.push({
                    pathname: "/admin-course-details" as never,
                    params: { courseId: course.id },
                  })
                }
                className="flex-row items-center rounded-3xl bg-white p-4 shadow-sm"
              >
                <View
                  className={`h-20 w-20 items-center justify-center rounded-2xl ${colors[index % colors.length][0]}`}
                >
                  <Text
                    className="text-center text-base font-bold"
                    style={{ color: colors[index % colors.length][1] }}
                  >
                    {course.code.replace(/[-\s]+/, "\n")}
                  </Text>
                </View>
                <View className="ml-4 flex-1">
                  <Text
                    numberOfLines={2}
                    className="text-base font-bold text-slate-950"
                  >
                    {course.title}
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    Level {course.level ?? "-"} | Term {course.term ?? "-"} |{" "}
                    {course.courseType ?? "Type"} | {course.credits} credits
                  </Text>
                  {course.tags.length ? (
                    <View className="mt-3 self-start rounded-full bg-blue-50 px-3 py-1">
                      <Text className="text-xs font-semibold text-brand">
                        {course.tags[0]}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View
                  className={`mr-3 rounded-full px-3 py-2 ${(course.status ?? "active") === "active" ? "bg-emerald-100" : course.status === "draft" ? "bg-slate-100" : "bg-slate-200"}`}
                >
                  <Text
                    className={`text-xs font-semibold ${(course.status ?? "active") === "active" ? "text-emerald-700" : "text-slate-600"}`}
                  >
                    {(course.status ?? "active").charAt(0).toUpperCase() +
                      (course.status ?? "active").slice(1)}
                  </Text>
                </View>
                <Pressable
                  onPress={(event) => {
                    event.stopPropagation();
                    setMenuCourse(course);
                  }}
                  hitSlop={10}
                  className="h-10 w-8 items-center justify-center"
                >
                  <Feather name="more-vertical" size={20} color="#64748B" />
                </Pressable>
              </Pressable>
            ))
          ) : (
            <Text className="mt-8 text-center text-sm text-slate-500">
              No courses match this filter.
            </Text>
          )}
        </View>
      </ScrollView>
      <CourseManagementMenu
        course={menuCourse}
        onClose={() => setMenuCourse(null)}
        onRefresh={onRefresh}
      />
      <View className="flex-row justify-around border-t border-slate-200 bg-white px-2 py-3">
        {nav.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            className="items-center gap-1 px-2"
          >
            <Feather
              name={item.icon}
              size={21}
              color={item.id === "courses" ? "#1670F8" : "#64748B"}
            />
            <Text
              className={`text-[10px] font-semibold ${item.id === "courses" ? "text-[#1670F8]" : "text-slate-500"}`}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
function CourseManagementMenu({
  course,
  onClose,
  onRefresh,
}: {
  course: Course | null;
  onClose: () => void;
  onRefresh: () => Promise<void>;
}) {
  if (!course) return null;
  const status = course.status ?? "active";
  const updateStatus = async (next: CourseStatus) => {
    try {
      await services.archiveCourse(course, next);
      onClose();
      await onRefresh();
    } catch (reason) {
      Alert.alert(
        "Could not update course",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    }
  };
  const removeDraft = () =>
    Alert.alert(
      "Delete draft?",
      `Delete ${course.code} and its unpublished course data?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete draft",
          style: "destructive",
          onPress: () => {
            void services
              .deleteCourse(course.id)
              .then(async () => {
                onClose();
                await onRefresh();
              })
              .catch((reason) =>
                Alert.alert(
                  "Could not delete draft",
                  reason instanceof Error
                    ? reason.message
                    : "Please try again.",
                ),
              );
          },
        },
      ],
    );
  const actions =
    status === "active"
      ? [
          {
            label: "Edit Course",
            icon: "edit-3" as const,
            onPress: () => {
              onClose();
              router.push({
                pathname: "/admin-course-form",
                params: { courseId: course.id },
              });
            },
          },
          {
            label: "Archive Course",
            icon: "archive" as const,
            onPress: () => {
              void updateStatus("archived");
            },
          },
        ]
      : status === "archived"
        ? [
            {
              label: "Edit Course",
              icon: "edit-3" as const,
              onPress: () => {
                onClose();
                router.push({
                  pathname: "/admin-course-form",
                  params: { courseId: course.id },
                });
              },
            },
            {
              label: "Restore Course",
              icon: "rotate-ccw" as const,
              onPress: () => {
                void updateStatus("active");
              },
            },
          ]
        : [
            {
              label: "Edit Course",
              icon: "edit-3" as const,
              onPress: () => {
                onClose();
                router.push({
                  pathname: "/admin-course-form",
                  params: { courseId: course.id },
                });
              },
            },
            {
              label: "Publish Course",
              icon: "send" as const,
              onPress: () => {
                void updateStatus("active");
              },
            },
            {
              label: "Delete Draft",
              icon: "trash-2" as const,
              destructive: true,
              onPress: removeDraft,
            },
          ];
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} className="flex-1 justify-end bg-black/30">
        <Pressable
          onPress={() => {}}
          className="rounded-t-3xl bg-white px-5 pb-10 pt-5"
        >
          <View className="mb-4 h-1.5 w-10 self-center rounded-full bg-slate-200" />
          <Text className="text-lg font-bold text-slate-950">
            Manage {course.code}
          </Text>
          <Text className="mt-1 text-sm text-slate-500">{course.title}</Text>
          <View className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={action.onPress}
                className="flex-row items-center border-b border-slate-100 px-4 py-4 last:border-b-0"
              >
                <Feather
                  name={action.icon}
                  size={19}
                  color={
                    "destructive" in action && action.destructive
                      ? "#E11D48"
                      : "#1670F8"
                  }
                />
                <Text
                  className={`ml-3 text-base font-semibold ${"destructive" in action && action.destructive ? "text-rose-600" : "text-slate-900"}`}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
          <Pressable
            onPress={onClose}
            className="mt-4 items-center rounded-xl bg-slate-100 py-3"
          >
            <Text className="font-semibold text-slate-700">Cancel</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function AdminMembersPage({
  data,
  profile,
  onSelect,
  selectedMember,
  onSelectMember,
  onCloseMember,
}: {
  data: AdminData;
  profile: Profile;
  onSelect: (view: AdminView) => void;
  selectedMember: Profile | null;
  onSelectMember: (member: Profile) => void;
  onCloseMember: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "students" | "teachers">("all");
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const teacherByAccount = new Map(
    data.teacherProfiles
      .filter((item) => item.linkedUserId)
      .map((item) => [item.linkedUserId as string, item]),
  );
  const teacherRows = data.teacherProfiles.map((teacher) => ({
    id: teacher.id,
    name: teacher.name,
    email: teacher.email,
    department: teacher.department,
    role: "teacher" as const,
    active: true,
    linked: Boolean(teacher.linkedUserId),
    profile: null as Profile | null,
  }));
  const studentRows = data.users
    .filter((user) => user.role === "student")
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      department: user.department,
      role: "student" as const,
      active: user.active !== false,
      linked: true,
      profile: user,
    }));
  const rows = [...studentRows, ...teacherRows].filter(
    (item) =>
      `${item.name} ${item.email} ${item.department}`
        .toLowerCase()
        .includes(search.toLowerCase()) &&
      (filter === "all" ||
        (filter === "students" && item.role === "student") ||
        (filter === "teachers" && item.role === "teacher")),
  );
  const nav: {
    id: AdminView;
    label: string;
    icon: keyof typeof Feather.glyphMap;
  }[] = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "courses", label: "Courses", icon: "book-open" },
    { id: "members", label: "Members", icon: "users" },
    { id: "moderation", label: "Moderation", icon: "shield" },
    { id: "analytics", label: "Analytics", icon: "bar-chart-2" },
  ];
  const palette = [
    ["bg-blue-100", "#1670F8"],
    ["bg-violet-100", "#7C3AED"],
    ["bg-rose-100", "#E11D48"],
    ["bg-emerald-100", "#059669"],
  ];
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 bg-[#F5F6F8] dark:bg-slate-950">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 96 }}>
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-3xl font-bold text-slate-950 dark:text-white">
              Members
            </Text>
            <Text className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Manage students and teachers of CUET
            </Text>
          </View>
        </View>
        <View className="mt-7 flex-row gap-3">
          <MemberMetric
            icon="users"
            iconBg="bg-blue-100"
            color="#1670F8"
            value={studentRows.length + teacherRows.length}
            label="Total Users"
          />
          <MemberMetric
            icon="graduation-cap"
            iconBg="bg-emerald-100"
            color="#059669"
            value={studentRows.length}
            label="Students"
          />
          <MemberMetric
            icon="user"
            iconBg="bg-violet-100"
            color="#8B16E8"
            value={teacherRows.length}
            label="Teachers"
          />
        </View>{" "}
        <View className="mt-5 flex-row items-center gap-3">
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Search by name, email or department..."
            className="mt-0 flex-1"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Cycle member filter"
            onPress={() =>
              setFilter(
                filter === "all"
                  ? "students"
                  : filter === "students"
                    ? "teachers"
                    : "all",
              )
            }
            className="h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white"
          >
            <Feather name="sliders" size={19} color="#1670F8" />
          </Pressable>
        </View>
        <View className="mt-5 flex-row flex-wrap gap-2">
          {(
            [
              ["all", "All"],
              ["students", "Students"],
              ["teachers", "Teachers"],
            ] as const
          ).map(([id, label]) => (
            <Pressable
              key={id}
              onPress={() => setFilter(id)}
              className={`rounded-full px-4 py-3 ${filter === id ? "bg-[#1670F8]" : "bg-slate-100"}`}
            >
              <Text
                className={`text-sm font-semibold ${filter === id ? "text-white" : "text-slate-600"}`}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View className="mt-5 flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-slate-500">
            {rows.length} members
          </Text>
          <Pressable
            onPress={() => setAdding(true)}
            className="flex-row items-center gap-2 rounded-xl bg-[#1670F8] px-4 py-3"
          >
            <Feather name="plus" size={19} color="white" />
            <Text className="text-sm font-semibold text-white">
              Add Teacher
            </Text>
          </Pressable>
        </View>
        <View className="mt-3 gap-2">
          {rows.map((item, index) => (
            <Pressable
              key={item.id}
              onPress={() =>
                onSelectMember(
                  item.profile ?? {
                    id: item.id,
                    name: item.name,
                    email: item.email,
                    role: item.role,
                    department: item.department,
                    active: item.active,
                    emailVerified: true,
                    designation:
                      item.role === "teacher" ? "Teacher" : undefined,
                  },
                )
              }
              className="flex-row items-center rounded-3xl bg-white p-4 shadow-sm dark:bg-slate-900"
            >
              <View
                className={`h-16 w-16 items-center justify-center rounded-full ${palette[index % palette.length][0]}`}
              >
                <Text
                  className="text-xl font-bold"
                  style={{ color: palette[index % palette.length][1] }}
                >
                  {item.name
                    .split(" ")
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </Text>
              </View>
              <View className="ml-4 flex-1">
                <Text className="text-base font-bold text-slate-950 dark:text-white">
                  {item.name}
                </Text>
                <Text
                  numberOfLines={1}
                  className="mt-1 text-xs text-slate-500 dark:text-slate-400"
                >
                  {item.email || "Email not added"}
                </Text>
                <View className="mt-2 flex-row gap-2">
                  <View
                    className={`rounded-full px-3 py-1 ${item.role === "student" ? "bg-blue-50" : "bg-violet-100"}`}
                  >
                    <Text
                      className={`text-xs font-semibold ${item.role === "student" ? "text-brand" : "text-violet-700"}`}
                    >
                      {item.role === "student" ? "Student" : "Teacher"}
                    </Text>
                  </View>
                  <View className="rounded-full bg-slate-100 px-3 py-1">
                    <Text className="text-xs font-semibold text-slate-600">
                      {item.department}
                    </Text>
                  </View>
                </View>
              </View>
              <View
                className={`mr-3 rounded-full px-3 py-2 ${item.role === "teacher" && !item.linked ? "bg-amber-100" : item.active ? "bg-emerald-100" : "bg-rose-100"}`}
              >
                <Text
                  className={`text-xs font-semibold ${item.role === "teacher" && !item.linked ? "text-amber-700" : item.active ? "text-emerald-700" : "text-rose-700"}`}
                >
                  {item.role === "teacher" && !item.linked
                    ? "Not linked"
                    : item.active
                      ? "â— Active"
                      : "â— Suspended"}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>{" "}
      </ScrollView>
      <MemberProfileModal
        member={selectedMember}
        courses={data.courses}
        reviews={data.reviews}
        questions={data.questions}
        reports={data.reports}
        onClose={onCloseMember}
      />
      {adding ? (
        <TeacherProfileEditor
          onClose={() => setAdding(false)}
          onSaved={() => setAdding(false)}
        />
      ) : null}
      <View className="flex-row justify-around border-t border-slate-200 bg-white px-2 py-3">
        {nav.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            className="items-center gap-1 px-2"
          >
            <Feather
              name={item.icon}
              size={21}
              color={item.id === "members" ? "#1670F8" : "#64748B"}
            />
            <Text
              className={`text-[10px] font-semibold ${item.id === "members" ? "text-[#1670F8]" : "text-slate-500"}`}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
function AdminModerationPage({
  data,
  profile,
  onSelect,
  onRefresh,
}: {
  data: AdminData;
  profile: Profile;
  onSelect: (view: AdminView) => void;
  onRefresh: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"reports" | "history">("reports");
  const [search, setSearch] = useState("");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const reports = data.reports.filter(
    (report) =>
      (tab === "reports"
        ? report.status === "pending"
        : report.status !== "pending") &&
      `${report.reason} ${report.category} ${report.contentType} ${report.description}`
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const nav: {
    id: AdminView;
    label: string;
    icon: keyof typeof Feather.glyphMap;
  }[] = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "courses", label: "Courses", icon: "book-open" },
    { id: "members", label: "Members", icon: "users" },
    { id: "moderation", label: "Moderation", icon: "shield" },
    { id: "analytics", label: "Analytics", icon: "bar-chart-2" },
  ];
  const reported = data.reports.length;
  const pending = data.reports.filter(
    (report) => report.status === "pending",
  ).length;
  const resolved = data.reports.filter(
    (report) => report.status !== "pending",
  ).length;
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 bg-[#F5F6F8]">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 96 }}>
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-3xl font-bold text-slate-950">
              Moderation
            </Text>
            <Text className="mt-1 text-sm text-slate-500">
              Review reports from students and teachers.
            </Text>
          </View>
        </View>
        <View className="mt-6 flex-row rounded-2xl bg-slate-100 p-1">
          <Pressable
            onPress={() => setTab("reports")}
            className={`flex-1 rounded-xl py-3 ${tab === "reports" ? "bg-[#1670F8]" : ""}`}
          >
            <Text
              className={`text-center text-sm font-semibold ${tab === "reports" ? "text-white" : "text-slate-500"}`}
            >
              Reported Reviews
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab("history")}
            className={`flex-1 rounded-xl py-3 ${tab === "history" ? "bg-[#1670F8]" : ""}`}
          >
            <Text
              className={`text-center text-sm font-semibold ${tab === "history" ? "text-white" : "text-slate-500"}`}
            >
              History
            </Text>
          </Pressable>
        </View>
        <View className="mt-5 flex-row gap-3">
          <ModerationMetric
            icon="flag"
            iconBg="bg-rose-100"
            color="#EF4444"
            value={reported}
            label="Reported"
          />
          <ModerationMetric
            icon="clock"
            iconBg="bg-amber-100"
            color="#F5A623"
            value={pending}
            label="Pending"
          />
          <ModerationMetric
            icon="check"
            iconBg="bg-emerald-100"
            color="#22C55E"
            value={resolved}
            label="Resolved"
          />
          <ModerationMetric
            icon="shield"
            iconBg="bg-slate-100"
            color="#64748B"
            value={data.appeals.length}
            label="Appeals"
          />
        </View>
        <View className="mt-5 flex-row items-center gap-3">
          <Search
            value={search}
            onChange={setSearch}
            placeholder="Search by course, teacher, or reporter..."
            className="mt-0 flex-1"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Toggle moderation filter"
            onPress={() => setTab(tab === "reports" ? "history" : "reports")}
            className="h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white"
          >
            <Feather name="sliders" size={19} color="#1670F8" />
          </Pressable>
        </View>
        {reports.length ? (
          <View className="mt-4 gap-3">
            {reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                data={data}
                onResolved={onRefresh}
              />
            ))}
          </View>
        ) : (
          <View className="mt-8 items-center rounded-3xl bg-white px-6 py-12">
            <View className="h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <Feather name="shield" size={30} color="#22C55E" />
            </View>
            <Text className="mt-5 text-lg font-bold text-slate-950">
              {tab === "reports"
                ? "No reported reviews"
                : "No moderation history"}
            </Text>
            <Text className="mt-2 text-center text-sm leading-5 text-slate-500">
              {tab === "reports"
                ? "Everything is looking good. New reports from your platform will appear here for review."
                : "Resolved moderation actions will appear here."}
            </Text>
          </View>
        )}
      </ScrollView>
      <View className="flex-row justify-around border-t border-slate-200 bg-white px-2 py-3">
        {nav.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            className="items-center gap-1 px-2"
          >
            <Feather
              name={item.icon}
              size={21}
              color={item.id === "moderation" ? "#1670F8" : "#64748B"}
            />
            <Text
              className={`text-[10px] font-semibold ${item.id === "moderation" ? "text-[#1670F8]" : "text-slate-500"}`}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
function AdminAnalyticsPage({
  data: sourceData,
  profile,
  onSelect,
}: {
  data: AdminData;
  profile: Profile;
  onSelect: (view: AdminView) => void;
}) {
  const [tab, setTab] = useState<
    "overview" | "courses" | "teachers" | "reviews"
  >("overview");
  const [period, setPeriod] = useState<PeriodKey>("6m");
  const data = {
    ...sourceData,
    reviews: sourceData.reviews.filter((review) =>
      isInPeriod(review.createdAt, period),
    ),
    reports: sourceData.reports.filter((report) =>
      isInPeriod(report.createdAt, period),
    ),
  };
  const students = data.users.filter((user) => user.role === "student");
  const teachers = data.users.filter((user) => user.role === "teacher");
  const ratings = data.reviews.flatMap((review) =>
    Object.values(review.ratings),
  );
  const average = ratings.length
    ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length
    : 0;
  const activeUsers = data.users.filter((user) => user.active !== false).length;
  const suspendedUsers = data.users.filter(
    (user) => user.active === false,
  ).length;
  const unverifiedUsers = data.users.filter(
    (user) => user.emailVerified === false,
  ).length;
  const courseScores = data.courses
    .map((course) => {
      const courseReviews = data.reviews.filter(
        (review) => review.courseId === course.id,
      );
      const score = courseReviews.length
        ? courseReviews.reduce(
            (sum, review) =>
              sum +
              Object.values(review.ratings).reduce(
                (total, value) => total + value,
                0,
              ) /
                Object.values(review.ratings).length,
            0,
          ) / courseReviews.length
        : 0;
      return { course, score, count: courseReviews.length };
    })
    .sort(
      (left, right) => right.score - left.score || right.count - left.count,
    );
  const attentionCourses = courseScores.filter(
    (item) => item.count > 0 && item.score < 3,
  );
  const teacherScores = teachers
    .map((teacher) => {
      const teacherReviews = data.professorReviews.filter(
        (review) => review.professorId === teacher.id,
      );
      return {
        teacher,
        score: teacherReviews.length
          ? teacherReviews.reduce((sum, review) => sum + review.rating, 0) /
            teacherReviews.length
          : 0,
        count: teacherReviews.length,
      };
    })
    .filter((item) => item.count > 0)
    .sort((left, right) => right.score - left.score);
  const responseCount = [...data.reviews, ...data.professorReviews].reduce(
    (sum, review) => sum + (review.responses?.length ?? 0),
    0,
  );
  const unansweredQuestions = data.questions.filter(
    (question) => !question.answers?.length,
  ).length;
  const activityPoints = Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));
    const next = new Date(date);
    next.setMonth(next.getMonth() + 1);
    return {
      label: date.toLocaleString(undefined, { month: "short" }),
      reviews: data.reviews.filter(
        (item) =>
          item.createdAt >= date.getTime() && item.createdAt < next.getTime(),
      ).length,
      questions: data.questions.filter(
        (item) =>
          item.createdAt >= date.getTime() && item.createdAt < next.getTime(),
      ).length,
      reports: data.reports.filter(
        (item) =>
          item.createdAt >= date.getTime() && item.createdAt < next.getTime(),
      ).length,
    };
  });
  const nav: {
    id: AdminView;
    label: string;
    icon: keyof typeof Feather.glyphMap;
  }[] = [
    { id: "overview", label: "Overview", icon: "grid" },
    { id: "courses", label: "Courses", icon: "book-open" },
    { id: "members", label: "Members", icon: "users" },
    { id: "moderation", label: "Moderation", icon: "shield" },
    { id: "analytics", label: "Analytics", icon: "bar-chart-2" },
  ];
  const title =
    tab === "overview"
      ? "Analytics"
      : tab === "courses"
        ? "Course Analytics"
        : tab === "teachers"
          ? "Teacher Analytics"
          : "Review Analytics";
  const subtitle =
    tab === "overview"
      ? "Insights to build a better learning community."
      : tab === "courses"
        ? "Track course performance and feedback."
        : tab === "teachers"
          ? "Evaluate performance and engagement."
          : "Explore review trends.";
  const section =
    tab === "overview" ? (
      <>
        <AnalyticsGrid
          values={[
            [
              students.length + teachers.length,
              "Total Users",
              "users",
              "bg-blue-100",
              "#1670F8",
            ],
            [
              data.courses.length,
              "Total Courses",
              "book-open",
              "bg-emerald-100",
              "#059669",
            ],
            [
              data.reviews.length,
              "Total Reviews",
              "star",
              "bg-amber-100",
              "#F5A623",
            ],
            [
              data.reports.filter((report) => report.status === "pending")
                .length,
              "Pending Reports",
              "flag",
              "bg-rose-100",
              "#EF4444",
            ],
          ]}
        />
        <AnalyticsPanel title="Platform Activity">
          <ActivityTrend points={activityPoints} />
        </AnalyticsPanel>
        <AnalyticsPanel title="Account Status">
          <AccountStatus
            active={activeUsers}
            suspended={suspendedUsers}
            unverified={unverifiedUsers}
            total={data.users.length}
          />
        </AnalyticsPanel>
        <AnalyticsPanel title="Needs Attention">
          <MetricGrid
            values={[
              [
                "Pending reports",
                data.reports.filter((report) => report.status === "pending")
                  .length,
              ],
              ["Unanswered questions", unansweredQuestions],
              ["Courses under 3.0", attentionCourses.length],
              ["Responses posted", responseCount],
            ]}
          />
        </AnalyticsPanel>
      </>
    ) : tab === "courses" ? (
      <>
        <AnalyticsGrid
          values={[
            [
              data.courses.length,
              "Total courses",
              "book-open",
              "bg-blue-100",
              "#1670F8",
            ],
            [
              data.courses.filter(
                (course) => (course.status ?? "active") === "active",
              ).length,
              "Active",
              "book-open",
              "bg-emerald-100",
              "#059669",
            ],
            [
              data.courses.filter((course) => course.status === "archived")
                .length,
              "Archived",
              "archive",
              "bg-slate-100",
              "#64748B",
            ],
          ]}
        />
        <AnalyticsPanel title="Top Rated Courses">
          {courseScores.filter((item) => item.count > 0).length ? (
            courseScores
              .filter((item) => item.count > 0)
              .slice(0, 5)
              .map((item) => (
                <View
                  key={item.course.id}
                  className="mb-3 flex-row items-center justify-between"
                >
                  <View className="flex-1">
                    <Text className="font-semibold text-slate-950">
                      {item.course.code} | {item.course.title}
                    </Text>
                    <Text className="mt-1 text-xs text-slate-500">
                      {item.count} review{item.count === 1 ? "" : "s"}
                    </Text>
                  </View>
                  <Text className="font-bold text-amber-500">
                    {item.score.toFixed(1)} / 5
                  </Text>
                </View>
              ))
          ) : (
            <AnalyticsEmpty
              icon="star"
              text="No course ratings have been submitted yet."
            />
          )}
        </AnalyticsPanel>
        <AnalyticsPanel title="Courses Needing Attention">
          {attentionCourses.length ? (
            attentionCourses.slice(0, 5).map((item) => (
              <View
                key={item.course.id}
                className="mb-3 flex-row items-center justify-between"
              >
                <Text className="flex-1 font-semibold text-slate-950">
                  {item.course.code} | {item.course.title}
                </Text>
                <Text className="font-bold text-rose-600">
                  {item.score.toFixed(1)} / 5
                </Text>
              </View>
            ))
          ) : (
            <AnalyticsEmpty
              icon="check-circle"
              text="No courses currently need attention."
            />
          )}
        </AnalyticsPanel>
      </>
    ) : tab === "teachers" ? (
      <>
        <AnalyticsGrid
          values={[
            [
              teachers.length,
              "Total teachers",
              "users",
              "bg-blue-100",
              "#1670F8",
            ],
            [
              teachers.filter((teacher) => teacher.active !== false).length,
              "Active",
              "book-open",
              "bg-emerald-100",
              "#059669",
            ],
            [
              teachers.filter((teacher) => teacher.active === false).length,
              "Suspended",
              "user-x",
              "bg-rose-100",
              "#EF4444",
            ],
          ]}
        />
        <AnalyticsPanel title="Top Rated Teachers">
          {teacherScores.length ? (
            teacherScores.slice(0, 5).map((item) => (
              <View
                key={item.teacher.id}
                className="mb-3 flex-row items-center justify-between"
              >
                <View className="flex-1">
                  <Text className="font-semibold text-slate-950">
                    {item.teacher.name}
                  </Text>
                  <Text className="mt-1 text-xs text-slate-500">
                    {item.count} review{item.count === 1 ? "" : "s"}
                  </Text>
                </View>
                <Text className="font-bold text-amber-500">
                  {item.score.toFixed(1)} / 5
                </Text>
              </View>
            ))
          ) : (
            <AnalyticsEmpty
              icon="award"
              text="No teacher ratings have been submitted yet."
            />
          )}
        </AnalyticsPanel>
        <AnalyticsPanel title="Teacher Response Rate">
          <MetricGrid
            values={[
              ["Review responses", responseCount],
              ["Unanswered questions", unansweredQuestions],
              ["Teacher reviews", data.professorReviews.length],
            ]}
          />
        </AnalyticsPanel>
      </>
    ) : (
      <>
        <AnalyticsGrid
          values={[
            [
              data.reviews.length,
              "Total reviews",
              "star",
              "bg-amber-100",
              "#F5A623",
            ],
            [
              average ? `${average.toFixed(1)} / 5` : "-",
              "Average rating",
              "bar-chart-2",
              "bg-blue-100",
              "#1670F8",
            ],
            [
              data.reviews.filter((review) => review.anonymous).length,
              "Anonymous",
              "shield",
              "bg-violet-100",
              "#7C3AED",
            ],
          ]}
        />
        <AnalyticsPanel title="Rating Distribution">
          {ratings.length ? (
            <View className="gap-3">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = ratings.filter(
                  (value) => Math.round(value) === rating,
                ).length;
                return (
                  <View key={rating} className="flex-row items-center gap-3">
                    <Text className="w-8 text-sm font-semibold text-slate-600">
                      {rating} â˜…
                    </Text>
                    <View className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                      <View
                        className="h-full rounded-full bg-[#1670F8]"
                        style={{ width: `${(count / ratings.length) * 100}%` }}
                      />
                    </View>
                    <Text className="w-9 text-right text-xs text-slate-500">
                      {Math.round((count / ratings.length) * 100)}%
                    </Text>
                  </View>
                );
              })}
            </View>
          ) : (
            <AnalyticsEmpty
              icon="star"
              text="Rating distribution will appear after reviews are submitted."
            />
          )}
        </AnalyticsPanel>
        <AnalyticsPanel title="Recent Reviews">
          {data.reviews.length ? (
            data.reviews.slice(0, 3).map((review) => (
              <View
                key={review.id}
                className="border-b border-slate-100 py-3 last:border-b-0"
              >
                <Text className="text-sm font-semibold text-slate-950">
                  {data.courses.find((course) => course.id === review.courseId)
                    ?.code ?? "Course review"}
                </Text>
                <Text numberOfLines={1} className="mt-1 text-xs text-slate-500">
                  {review.text}
                </Text>
              </View>
            ))
          ) : (
            <AnalyticsEmpty
              icon="message-square"
              text="Recent reviews will appear here."
            />
          )}
        </AnalyticsPanel>
      </>
    );
  return (
    <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 bg-[#F5F6F8]">
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 96 }}>
        <View className="flex-row items-start justify-between">
          <View>
            <Text className="text-2xl font-bold text-slate-950">{title}</Text>
            <Text className="mt-1 max-w-[260px] text-sm text-slate-500">
              {subtitle}
            </Text>
          </View>
        </View>
        <View className="mt-6 flex-row flex-wrap gap-2">
          {(["overview", "courses", "teachers", "reviews"] as const).map(
            (item) => (
              <Pressable
                key={item}
                onPress={() => setTab(item)}
                className={`rounded-full px-4 py-3 ${tab === item ? "bg-[#1670F8]" : "bg-slate-100"}`}
              >
                <Text
                  className={`text-sm font-semibold capitalize ${tab === item ? "text-white" : "text-slate-600"}`}
                >
                  {item}
                </Text>
              </Pressable>
            ),
          )}
        </View>
        <View className="mt-6 flex-row justify-end">
          <PeriodPicker
            value={period}
            onChange={setPeriod}
            choices={["30d", "90d", "6m", "12m"]}
          />
        </View>
        {section}
      </ScrollView>
      <View className="flex-row justify-around border-t border-slate-200 bg-white px-2 py-3">
        {nav.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => onSelect(item.id)}
            className="items-center gap-1 px-2"
          >
            <Feather
              name={item.icon}
              size={21}
              color={item.id === "analytics" ? "#1670F8" : "#64748B"}
            />
            <Text
              className={`text-[10px] font-semibold ${item.id === "analytics" ? "text-[#1670F8]" : "text-slate-500"}`}
            >
              {item.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}
function AnalyticsGrid({
  values,
}: {
  values: [
    number | string,
    string,
    keyof typeof Feather.glyphMap,
    string,
    string,
  ][];
}) {
  return (
    <View className="mt-3 flex-row flex-wrap gap-3">
      {values.map(([value, label, icon, background, color]) => (
        <View
          key={label}
          className="w-[47%] rounded-2xl bg-white p-4 dark:bg-slate-900"
        >
          <View
            className={`h-10 w-10 items-center justify-center rounded-xl ${background}`}
          >
            <Feather name={icon} size={19} color={color} />
          </View>
          <Text className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
            {value}
          </Text>
          <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {label}
          </Text>
        </View>
      ))}
    </View>
  );
}
function AnalyticsPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-5 rounded-3xl bg-white p-4 dark:bg-slate-900">
      <Text className="text-base font-bold text-slate-950 dark:text-white">
        {title}
      </Text>
      <View className="mt-4">{children}</View>
    </View>
  );
}
function AnalyticsEmpty({
  icon,
  text,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
}) {
  return (
    <View className="items-center py-7">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-slate-100">
        <Feather name={icon} size={22} color="#94A3B8" />
      </View>
      <Text className="mt-3 max-w-[280px] text-center text-sm leading-5 text-slate-500">
        {text}
      </Text>
    </View>
  );
}
function ActivityTrend({
  points,
}: {
  points: {
    label: string;
    reviews: number;
    questions: number;
    reports: number;
  }[];
}) {
  const max = Math.max(
    1,
    ...points.flatMap((point) => [
      point.reviews,
      point.questions,
      point.reports,
    ]),
  );
  return (
    <View>
      <View className="h-36 flex-row items-end gap-2">
        {points.map((point) => (
          <View key={point.label} className="flex-1 items-center">
            <View className="h-28 w-full flex-row items-end justify-center gap-0.5">
              <View
                className="w-1/3 rounded-t bg-brand"
                style={{
                  height: `${Math.max(4, (point.reviews / max) * 100)}%`,
                }}
              />
              <View
                className="w-1/3 rounded-t bg-emerald-500"
                style={{
                  height: `${Math.max(4, (point.questions / max) * 100)}%`,
                }}
              />
              <View
                className="w-1/3 rounded-t bg-rose-400"
                style={{
                  height: `${Math.max(4, (point.reports / max) * 100)}%`,
                }}
              />
            </View>
            <Text className="mt-2 text-[10px] text-slate-500">
              {point.label}
            </Text>
          </View>
        ))}
      </View>
      <View className="mt-4 flex-row gap-4">
        <Legend color="bg-brand" label="Reviews" />
        <Legend color="bg-emerald-500" label="Questions" />
        <Legend color="bg-rose-400" label="Reports" />
      </View>
    </View>
  );
}
function AccountStatus({
  active,
  suspended,
  unverified,
  total,
}: {
  active: number;
  suspended: number;
  unverified: number;
  total: number;
}) {
  const rows = [
    ["Active", active, "text-emerald-600"],
    ["Suspended", suspended, "text-rose-600"],
    ["Unverified", unverified, "text-amber-600"],
  ] as const;
  return (
    <View className="gap-3">
      {rows.map(([label, value, tone]) => (
        <View key={label} className="flex-row items-center justify-between">
          <Text className={`text-sm font-semibold ${tone}`}>{label}</Text>
          <Text className="text-sm font-bold text-slate-700">
            {value} | {total ? Math.round((value / total) * 100) : 0}%
          </Text>
        </View>
      ))}
    </View>
  );
}
function ModerationMetric({
  icon,
  iconBg,
  color,
  value,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View className="w-[23%] rounded-2xl bg-white p-3 dark:bg-slate-900">
      <View
        className={`h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Feather name={icon} size={19} color={color} />
      </View>
      <Text className="mt-3 text-xl font-bold text-slate-950 dark:text-white">
        {value}
      </Text>
      <Text
        numberOfLines={1}
        className="mt-1 text-[11px] text-slate-500 dark:text-slate-400"
      >
        {label}
      </Text>
    </View>
  );
}
function MemberMetric({
  icon,
  iconBg,
  color,
  value,
  label,
}: {
  icon: string;
  iconBg: string;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View className="flex-1 rounded-2xl bg-white p-4 dark:bg-slate-900">
      <View
        className={`h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Feather
          name={
            (icon === "graduation-cap"
              ? "book-open"
              : icon) as keyof typeof Feather.glyphMap
          }
          size={20}
          color={color}
        />
      </View>
      <Text className="mt-3 text-2xl font-bold text-slate-950 dark:text-white">
        {value}
      </Text>
      <Text className="mt-1 text-xs text-slate-500 dark:text-slate-400">
        {label}
      </Text>
    </View>
  );
}
function CourseMetric({
  icon,
  iconBg,
  color,
  value,
  label,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  color: string;
  value: number;
  label: string;
}) {
  return (
    <View className="w-[23%] rounded-2xl bg-white p-3 dark:bg-slate-900">
      <View
        className={`h-10 w-10 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Feather name={icon} size={19} color={color} />
      </View>
      <Text className="mt-3 text-xl font-bold text-slate-950 dark:text-white">
        {value}
      </Text>
      <Text
        numberOfLines={1}
        className="mt-1 text-[11px] text-slate-500 dark:text-slate-400"
      >
        {label}
      </Text>
    </View>
  );
}
function OverviewSection({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-7">
      <View className="mb-3 flex-row items-center justify-between">
        <Text className="text-xl font-bold text-slate-950">{title}</Text>
        {onAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`View all ${title}`}
            hitSlop={8}
            onPress={onAction}
          >
            <Text className="text-sm font-semibold text-brand">{action}</Text>
          </Pressable>
        ) : (
          <Text className="text-sm font-semibold text-brand">{action}</Text>
        )}
      </View>
      {children}
    </View>
  );
}
function OverviewStat({
  icon,
  iconBg,
  iconColor,
  value,
  label,
  down = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
  down?: boolean;
}) {
  return (
    <View className="w-[22.8%] min-w-[76px] rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
      <View
        className={`h-9 w-9 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Feather name={icon} size={18} color={iconColor} />
      </View>
      <Text className="mt-3 text-xl font-bold text-slate-950">{value}</Text>
      <Text numberOfLines={1} className="mt-1 text-[11px] text-slate-500">
        {label}
      </Text>
      <Text
        numberOfLines={1}
        className={`mt-2 text-[10px] font-semibold ${down ? "text-rose-500" : "text-emerald-600"}`}
      >
        {down ? "â†“ 25%" : "â†‘ This month"}
      </Text>
    </View>
  );
}
function DistributionLabel({
  color,
  label,
  value,
  total,
}: {
  color: string;
  label: string;
  value: number;
  total: number;
}) {
  return (
    <View>
      <View className="flex-row items-center gap-1">
        <View className={`h-2.5 w-2.5 rounded-full ${color}`} />
        <Text className="text-xs text-slate-600">{label}</Text>
      </View>
      <Text className="mt-1 text-xs font-bold text-slate-900">
        {Math.round((value / total) * 100)}%{" "}
        <Text className="font-normal text-slate-500">({value})</Text>
      </Text>
    </View>
  );
}
function OverviewList({ children }: { children: React.ReactNode }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-slate-100 bg-white">
      {children}
    </View>
  );
}
function OverviewRow({
  icon,
  iconBg,
  color,
  title,
  detail,
  trailing,
  time,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  color: string;
  title: string;
  detail: string;
  trailing?: string;
  time?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-slate-100 p-4 last:border-b-0"
    >
      <View
        className={`h-11 w-11 items-center justify-center rounded-xl ${iconBg}`}
      >
        <Feather name={icon} size={19} color={color} />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-sm font-semibold text-slate-950">{title}</Text>
        <Text numberOfLines={1} className="mt-1 text-xs text-slate-500">
          {detail}
        </Text>
      </View>
      {trailing ? (
        <View className="mr-3 rounded-full bg-emerald-50 px-2.5 py-1">
          <Text className="text-xs font-semibold text-emerald-600">
            â— {trailing}
          </Text>
        </View>
      ) : null}
      {time ? (
        <Text className="mr-3 text-xs text-slate-400">{time}</Text>
      ) : null}
      <Feather name="chevron-right" size={18} color="#9CA3AF" />
    </Pressable>
  );
}
function Title({ title, text }: { title: string; text: string }) {
  return (
    <>
      <Text className="text-xl font-bold text-ink dark:text-white">
        {title}
      </Text>
      <Text className="mt-1 text-sm text-muted">{text}</Text>
    </>
  );
}
function MetricGrid({ values }: { values: [string, string | number][] }) {
  return (
    <View className="mt-5 flex-row flex-wrap gap-3">
      {values.map(([label, value]) => (
        <Card key={label} className="w-[47%] p-4">
          <Text className="text-2xl font-bold text-ink dark:text-white">
            {value}
          </Text>
          <Text className="mt-1 text-xs text-muted">{label}</Text>
        </Card>
      ))}
    </View>
  );
}
function AttentionRow({
  color,
  label,
  onPress,
}: {
  color: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="border-b border-slate-100 py-3 last:border-b-0 dark:border-slate-800"
    >
      <Text className={`text-sm font-medium ${color}`}>{label}</Text>
    </Pressable>
  );
}
function formatRelativeTime(timestamp: number) {
  const minutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  return minutes < 60
    ? `${minutes} minute${minutes === 1 ? "" : "s"} ago`
    : `${Math.floor(minutes / 60)} hour${Math.floor(minutes / 60) === 1 ? "" : "s"} ago`;
}
function OverviewMetric({
  title,
  value,
  detail,
  extra,
  onPress,
}: {
  title: string;
  value: number;
  detail: string;
  extra?: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="w-[47%]">
      <Card className="h-full p-4">
        <Text className="text-xs font-semibold text-muted">{title}</Text>
        <Text className="mt-2 text-2xl font-bold text-ink dark:text-white">
          {value}
        </Text>
        <Text className="mt-1 text-xs text-muted">{detail}</Text>
        {extra ? (
          <Text className="mt-1 text-xs font-semibold text-brand">{extra}</Text>
        ) : null}
      </Card>
    </Pressable>
  );
}
function HealthMetric({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <Card className="w-[47%] p-4">
      <Text className="text-xs text-muted">{title}</Text>
      <Text className="mt-2 text-lg font-bold text-ink dark:text-white">
        {value}
      </Text>
    </Card>
  );
}
function TrendChart({
  points,
  valueKey,
  color,
}: {
  points: { label: string; users: number; reviews: number }[];
  valueKey: "users" | "reviews";
  color: string;
}) {
  const max = Math.max(1, ...points.map((point) => point[valueKey]));
  return (
    <View className="mt-4">
      <View className="h-24 flex-row items-end gap-1">
        {points.map((point) => (
          <View key={point.label} className="flex-1 items-center">
            <View
              style={{
                height: `${Math.max((point[valueKey] / max) * 100, point[valueKey] ? 8 : 2)}%`,
              }}
              className={`w-full rounded-t ${color}`}
            />
            <Text className="mt-1 text-[9px] text-muted">{point.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
function SectionHeading({ title }: { title: string }) {
  return (
    <Text className="mt-7 text-lg font-bold text-ink dark:text-white">
      {title}
    </Text>
  );
}
function AnalyticsSummaryCards({
  users,
  reviews,
  courses,
  teacherAnalytics,
}: {
  users: Profile[];
  reviews: Review[];
  courses: Course[];
  teacherAnalytics: { average: number }[];
}) {
  const anonymous = reviews.filter((review) => review.anonymous).length;
  const average = reviews.length
    ? reviews.reduce(
        (sum, review) =>
          sum +
          Object.values(review.ratings).reduce(
            (total, rating) => total + rating,
            0,
          ) /
            Object.values(review.ratings).length,
        0,
      ) / reviews.length
    : 0;
  const activeTeachers = users.filter(
    (user) => user.role === "teacher" && user.active !== false,
  ).length;
  const teacherAverage = teacherAnalytics.length
    ? teacherAnalytics.reduce((sum, item) => sum + item.average, 0) /
      teacherAnalytics.length
    : 0;
  return (
    <View className="mt-5 gap-3">
      <InsightCard
        icon="ðŸ‘¥"
        title="Users"
        value={users.length}
        lines={[
          `Students ${users.filter((user) => user.role === "student").length}`,
          `Teachers ${users.filter((user) => user.role === "teacher").length}`,
          `Active today ${users.filter((user) => user.active !== false).length}`,
        ]}
      />
      <InsightCard
        icon="â­"
        title="Reviews"
        value={reviews.length}
        lines={[
          `Avg rating ${reviews.length ? average.toFixed(1) : "No data"}`,
          `Anonymous ${reviews.length ? Math.round((anonymous / reviews.length) * 100) : 0}%`,
        ]}
      />
      <InsightCard
        icon="ðŸ“š"
        title="Courses"
        value={courses.length}
        lines={[
          `Active ${courses.filter((course) => (course.status ?? "active") === "active").length}`,
          `Archived ${courses.filter((course) => course.status === "archived").length}`,
        ]}
      />
      <InsightCard
        icon="ðŸ‘¨â€ðŸ«"
        title="Teachers"
        value={users.filter((user) => user.role === "teacher").length}
        lines={[
          `Active ${activeTeachers}`,
          `Avg rating ${teacherAnalytics.length ? teacherAverage.toFixed(1) : "No data"}`,
        ]}
      />
    </View>
  );
}
function InsightCard({
  icon,
  title,
  value,
  lines,
}: {
  icon: string;
  title: string;
  value: number;
  lines: string[];
}) {
  return (
    <Card className="p-4">
      <Text className="text-sm font-semibold text-ink dark:text-white">
        {icon} {title}
      </Text>
      <Text className="mt-3 text-3xl font-bold text-ink dark:text-white">
        {value}
      </Text>
      <Text className="mt-1 text-xs text-muted">
        Total {title.toLowerCase()}
      </Text>
      {lines.map((line) => (
        <Text key={line} className="mt-2 text-xs text-muted">
          {line}
        </Text>
      ))}
    </Card>
  );
}
function DistributionCard({
  values,
  total,
}: {
  values: { label: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <Card className="mt-3">
      <View className="items-center">
        <View className="h-32 w-32 items-center justify-center rounded-full border-[18px] border-slate-200 dark:border-slate-700">
          <View className="h-16 w-16 items-center justify-center rounded-full bg-white dark:bg-slate-900">
            <Text className="text-xs font-semibold text-muted">Users</Text>
          </View>
        </View>
      </View>
      <View className="mt-5 gap-3">
        {values.map((item) => (
          <View
            key={item.label}
            className="flex-row items-center justify-between"
          >
            <View className="flex-row items-center gap-2">
              <View className={`h-2.5 w-2.5 rounded-full ${item.color}`} />
              <Text className="text-sm text-ink dark:text-white">
                {item.label}
              </Text>
            </View>
            <Text className="text-sm font-semibold text-muted">
              {total ? Math.round((item.value / total) * 100) : 0}%
            </Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
function RatingChart({
  values,
  total,
}: {
  values: { rating: number; count: number }[];
  total: number;
}) {
  const max = Math.max(1, ...values.map((item) => item.count));
  return (
    <View className="mt-3 gap-3">
      {values.map((item) => (
        <View key={item.rating} className="flex-row items-center gap-2">
          <Text className="w-8 text-xs text-muted">{item.rating} â­</Text>
          <View className="h-3 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
            <View
              style={{ width: `${(item.count / max) * 100}%` }}
              className="h-full rounded-full bg-amber-500"
            />
          </View>
          <Text className="w-12 text-right text-xs text-muted">
            {total ? Math.round((item.count / total) * 100) : 0}%
          </Text>
        </View>
      ))}
    </View>
  );
}
function MemberStats({
  students,
  teachers,
  pending,
}: {
  students: number;
  teachers: number;
  pending: number;
}) {
  return (
    <View className="mt-5 flex-row flex-wrap gap-3">
      <LegacyMemberMetric
        color="bg-blue-700"
        icon="users"
        value={students + teachers}
        label="Total"
      />
      <LegacyMemberMetric
        color="bg-emerald-700"
        icon="book-open"
        value={students}
        label="Students"
      />
      <LegacyMemberMetric
        color="bg-violet-700"
        icon="user"
        value={teachers}
        label="Teachers"
      />
      <LegacyMemberMetric
        color="bg-amber-700"
        icon="clock"
        value={pending}
        label="Pending"
      />
    </View>
  );
}
function LegacyMemberMetric({
  color,
  icon,
  value,
  label,
}: {
  color: string;
  icon: keyof typeof Feather.glyphMap;
  value: number;
  label: string;
}) {
  return (
    <View className={`w-[22%] min-w-20 rounded-2xl p-4 ${color}`}>
      <Feather name={icon} size={19} color="white" />
      <Text className="mt-3 text-2xl font-bold text-white">{value}</Text>
      <Text className="mt-1 text-xs text-white">{label}</Text>
    </View>
  );
}
function MemberCard({
  member,
  onPress,
}: {
  member: Profile;
  onPress: () => void;
}) {
  const status =
    member.active === false && member.emailVerified !== false
      ? "Suspended"
      : member.emailVerified === false
        ? "Pending"
        : "Active";
  const statusColor =
    status === "Active"
      ? "bg-emerald-700"
      : status === "Pending"
        ? "bg-amber-700"
        : "bg-rose-700";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View profile for ${member.name}`}
      onPress={onPress}
    >
      <Card className="mt-3 flex-row items-center p-4">
        <View className="h-12 w-12 items-center justify-center rounded-full bg-blue-600">
          <Text className="text-base font-bold text-white">
            {member.name.trim().charAt(0).toUpperCase() || "?"}
          </Text>
        </View>
        <View className="ml-3 flex-1">
          <Text className="font-semibold text-ink dark:text-white">
            {member.name}
          </Text>
          <Text numberOfLines={1} className="mt-1 text-xs text-muted">
            {member.email}
          </Text>
          <View className="mt-2 flex-row gap-2">
            <View className="rounded-full bg-blue-100 px-2.5 py-1 dark:bg-blue-950">
              <Text className="text-[11px] font-semibold text-brand">
                Student
              </Text>
            </View>
            <View className="rounded-full border border-slate-200 px-2.5 py-1 dark:border-slate-700">
              <Text className="text-[11px] font-semibold text-muted">
                {member.department}
              </Text>
            </View>
          </View>
        </View>
        <View className={`mr-3 rounded-full px-3 py-2 ${statusColor}`}>
          <Text className="text-xs font-semibold text-white">{status}</Text>
        </View>
        <Feather name="more-vertical" size={18} color="#94A3B8" />
      </Card>
    </Pressable>
  );
}
function TeacherMemberCard({
  teacher,
  linkedAccount,
}: {
  teacher: TeacherProfile;
  linkedAccount: Profile | null;
}) {
  return (
    <Card className="mt-3 flex-row items-center p-4">
      <View className="h-12 w-12 items-center justify-center rounded-full bg-violet-700">
        <Text className="text-base font-bold text-white">
          {teacher.name.trim().charAt(0).toUpperCase() || "?"}
        </Text>
      </View>
      <View className="ml-3 flex-1">
        <Text className="font-semibold text-ink dark:text-white">
          {teacher.name}
        </Text>
        <Text numberOfLines={1} className="mt-1 text-xs text-muted">
          {teacher.email || "Email not added"}
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-violet-100 px-2.5 py-1 dark:bg-violet-950">
            <Text className="text-[11px] font-semibold text-violet-700 dark:text-violet-300">
              Teacher
            </Text>
          </View>
          <View className="rounded-full border border-slate-200 px-2.5 py-1 dark:border-slate-700">
            <Text className="text-[11px] font-semibold text-muted">
              {teacher.department}
            </Text>
          </View>
        </View>
        <Text
          className={`mt-2 text-xs font-semibold ${linkedAccount ? "text-emerald-600" : "text-amber-600"}`}
        >
          {linkedAccount
            ? `Linked | ${linkedAccount.email}`
            : "Not linked to a teacher account"}
        </Text>
      </View>
      <Feather name="more-vertical" size={18} color="#94A3B8" />
    </Card>
  );
}
function MemberActions({
  value,
  onChange,
}: {
  value: "all" | "student" | "teacher" | "pending" | "suspended";
  onChange: (
    value: "all" | "student" | "teacher" | "pending" | "suspended",
  ) => void;
}) {
  return (
    <View className="mt-5 flex-row flex-wrap gap-2">
      {(["all", "student", "teacher", "pending", "suspended"] as const).map(
        (item) => (
          <Pressable
            key={item}
            accessibilityRole="tab"
            accessibilityState={{ selected: value === item }}
            onPress={() => onChange(item)}
            className={`rounded-full border px-4 py-3 ${value === item ? "border-brand bg-brand" : "border-slate-700 bg-slate-900"}`}
          >
            <Text
              className={`text-sm font-semibold ${value === item ? "text-white" : "text-slate-200"}`}
            >
              {item === "all"
                ? "All"
                : item === "student"
                  ? "Students"
                  : item === "teacher"
                    ? "Teachers"
                    : item === "pending"
                      ? "Pending"
                      : "Suspended"}
            </Text>
          </Pressable>
        ),
      )}
    </View>
  );
}
function CourseFilters({
  query,
  onQuery,
  department,
  onDepartment,
  level,
  onLevel,
  term,
  onTerm,
  status,
  onStatus,
  departments,
  open,
  onOpen,
  onClose,
  onApply,
}: {
  query: string;
  onQuery: (value: string) => void;
  department: string;
  onDepartment: (value: string) => void;
  level: "all" | "1" | "2" | "3" | "4";
  onLevel: (value: "all" | "1" | "2" | "3" | "4") => void;
  term: "all" | "1" | "2";
  onTerm: (value: "all" | "1" | "2") => void;
  status: "all" | "active" | "archived" | "draft";
  onStatus: (value: "all" | "active" | "archived" | "draft") => void;
  departments: string[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <View className="mt-5 flex-row items-center gap-2">
      <View className="flex-1">
        <Search
          value={query}
          onChange={onQuery}
          placeholder="Search courses"
          className="mt-0"
        />
      </View>
      <Pressable
        onPress={onOpen}
        className="flex-row items-center gap-2 rounded-xl border border-[#DCE7F7] bg-[#E7F0FC] px-3 py-3 dark:border-slate-700 dark:bg-slate-900"
      >
        <Feather name="sliders" size={16} color="#4F7EF7" />
        <Text className="text-sm font-semibold text-brand">Filter</Text>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={onClose}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[88%] rounded-t-3xl bg-white p-5 dark:bg-slate-900">
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-ink dark:text-white">
                Filter Courses
              </Text>
              <Pressable onPress={onClose}>
                <Feather name="x" size={22} color="#64748B" />
              </Pressable>
            </View>
            <FilterGroup
              label="Department"
              value={department}
              options={["all", ...departments]}
              onChange={onDepartment}
            />
            <FilterGroup
              label="Level"
              value={level}
              options={["all", "1", "2", "3", "4"]}
              labels={{
                all: "All",
                "1": "1st",
                "2": "2nd",
                "3": "3rd",
                "4": "4th",
              }}
              onChange={(value) => onLevel(value as typeof level)}
            />
            <FilterGroup
              label="Term"
              value={term}
              options={["all", "1", "2"]}
              onChange={(value) => onTerm(value as typeof term)}
            />
            <FilterGroup
              label="Status"
              value={status}
              options={["all", "active", "archived", "draft"]}
              onChange={(value) => onStatus(value as typeof status)}
            />
            <Button className="mt-6" onPress={onApply}>
              Apply
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}
function FilterGroup({
  label,
  value,
  options,
  labels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <View className="mt-5">
      <Text className="mb-2 text-sm font-semibold text-ink dark:text-white">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        {options.map((option) => (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            className={`flex-row items-center gap-2 rounded-xl border px-3 py-2.5 ${value === option ? "border-brand bg-blue-50 dark:bg-blue-950" : "border-slate-200 dark:border-slate-700"}`}
          >
            <View
              className={`h-4 w-4 rounded-full border-2 ${value === option ? "border-brand bg-brand" : "border-slate-300 dark:border-slate-600"}`}
            />
            <Text className="text-sm text-ink dark:text-white">
              {labels?.[option] ??
                (option === "all"
                  ? "All"
                  : option.charAt(0).toUpperCase() + option.slice(1))}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}
function FilterChoice({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-1">
      {options.map((option) => (
        <Pressable
          key={option}
          onPress={() => onChange(option)}
          className={`rounded-lg px-2.5 py-1.5 ${value === option ? "bg-brand" : "bg-slate-200 dark:bg-slate-800"}`}
        >
          <Text
            className={`text-[11px] capitalize ${value === option ? "text-white" : "text-muted"}`}
          >
            {option === "all" ? "All" : option}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
function MemberProfileModal({
  member,
  courses,
  reviews,
  questions,
  reports,
  onClose,
}: {
  member: Profile | null;
  courses: Course[];
  reviews: Review[];
  questions: CourseQuestion[];
  reports: Report[];
  onClose: () => void;
}) {
  if (!member) return null;
  const assignedCourses = courses.filter((course) =>
    course.teacherIds.includes(member.id),
  );
  const reviewCount =
    member.role === "teacher"
      ? dataReviewsForTeacher(member, reviews).length
      : reviews.length;
  const questionCount = member.role === "student" ? questions.length : 0;
  const reportCount = reports.length;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[88%] rounded-t-3xl bg-white p-5 dark:bg-slate-900">
          <ScrollView>
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-ink dark:text-white">
                Profile details
              </Text>
              <Pressable onPress={onClose}>
                <Feather name="x" size={22} color="#64748B" />
              </Pressable>
            </View>
            <View className="mt-5 items-center">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-brand">
                <Text className="text-3xl font-bold text-white">
                  {member.name.trim().charAt(0).toUpperCase() || "?"}
                </Text>
              </View>
              <Text className="mt-3 text-lg font-bold text-ink dark:text-white">
                {member.name}
              </Text>
              <Text className="mt-1 text-sm text-muted">{member.email}</Text>
              <Text className="mt-1 text-xs font-bold uppercase text-brand">
                {member.role}
              </Text>
            </View>
            <ProfileDetail label="Department" value={member.department} />
            <ProfileDetail
              label="Account status"
              value={member.active === false ? "Suspended" : "Active"}
            />
            <ProfileDetail
              label="Email verification"
              value={
                member.role === "teacher"
                  ? "Verified"
                  : member.emailVerified
                    ? "Verified"
                    : "Not verified"
              }
            />
            <ProfileDetail
              label="Reviews written / received"
              value={String(reviewCount)}
            />
            <ProfileDetail
              label="Questions asked"
              value={String(questionCount)}
            />
            <ProfileDetail
              label="Reports received"
              value={String(reportCount)}
            />
            {member.designation ? (
              <ProfileDetail label="Designation" value={member.designation} />
            ) : null}
            {member.bio ? (
              <ProfileDetail label="Bio" value={member.bio} />
            ) : null}
            {member.studentId ? (
              <ProfileDetail label="Student ID" value={member.studentId} />
            ) : null}
            {member.batch ? (
              <ProfileDetail label="Batch" value={member.batch} />
            ) : null}
            {member.currentLevel || member.currentTerm ? (
              <ProfileDetail
                label="Academic level"
                value={`Level ${member.currentLevel ?? "-"} | Term ${member.currentTerm ?? "-"}`}
              />
            ) : null}
            <ProfileDetail
              label="Suspensions"
              value={member.active === false ? "1 current suspension" : "0"}
            />
            {member.role === "teacher" ? (
              <>
                <Text className="mt-6 text-base font-bold text-ink dark:text-white">
                  Assigned courses
                </Text>
                {assignedCourses.length ? (
                  assignedCourses.map((course) => (
                    <Text key={course.id} className="mt-2 text-sm text-muted">
                      {course.code} | {course.title}
                    </Text>
                  ))
                ) : (
                  <Text className="mt-2 text-sm text-muted">
                    No courses assigned.
                  </Text>
                )}
              </>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
function dataReviewsForTeacher(member: Profile, reviews: Review[]) {
  return reviews.filter((review) =>
    review.responses?.some((response) => response.teacherName === member.name),
  );
}
function ProfileDetail({ label, value }: { label: string; value: string }) {
  return (
    <View className="mt-4 border-b border-slate-100 pb-3 dark:border-slate-800">
      <Text className="text-xs font-semibold uppercase text-muted">
        {label}
      </Text>
      <Text className="mt-1 text-sm text-ink dark:text-white">
        {value || "Not provided"}
      </Text>
    </View>
  );
}
function CourseDetailsModal({
  course,
  reviews,
  onClose,
}: {
  course: Course | null;
  reviews: Review[];
  onClose: () => void;
}) {
  if (!course) return null;
  const courseReviews = reviews.filter(
    (review) => review.courseId === course.id,
  );
  const average = courseReviews.length
    ? courseReviews.reduce(
        (sum, review) =>
          sum +
          Object.values(review.ratings).reduce(
            (total, rating) => total + rating,
            0,
          ) /
            Object.values(review.ratings).length,
        0,
      ) / courseReviews.length
    : 0;
  const metric = (key: keyof Review["ratings"]) =>
    courseReviews.length
      ? courseReviews.reduce((sum, review) => sum + review.ratings[key], 0) /
        courseReviews.length
      : 0;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/40">
        <View className="max-h-[90%] rounded-t-3xl bg-white p-5 dark:bg-slate-900">
          <ScrollView>
            <View className="flex-row items-center justify-between">
              <Text className="text-xl font-bold text-ink dark:text-white">
                Course details
              </Text>
              <Pressable onPress={onClose}>
                <Feather name="x" size={22} color="#64748B" />
              </Pressable>
            </View>
            <Text className="mt-5 text-sm font-bold text-brand">
              {course.code}
            </Text>
            <Text className="mt-1 text-2xl font-bold text-ink dark:text-white">
              {course.title}
            </Text>
            <ProfileDetail label="Department" value={course.department} />
            <ProfileDetail label="Credits" value={String(course.credits)} />
            <ProfileDetail
              label="Level and term"
              value={`Level ${course.level ?? "-"} | Term ${course.term ?? "-"}`}
            />
            <ProfileDetail
              label="Teachers"
              value={course.teacherNames.join(", ") || "None assigned"}
            />
            <ProfileDetail
              label="Status"
              value={(course.status ?? "active").toUpperCase()}
            />
            <Text className="mt-6 text-base font-bold text-ink dark:text-white">
              Course analytics
            </Text>
            <ProfileDetail
              label="Total reviews"
              value={String(courseReviews.length)}
            />
            <ProfileDetail
              label="Average rating"
              value={`${average.toFixed(1)} / 5`}
            />
            <ProfileDetail
              label="Teaching quality"
              value={`${metric("teachingQuality").toFixed(1)} / 5`}
            />
            <ProfileDetail
              label="Workload"
              value={`${metric("workload").toFixed(1)} / 5`}
            />
            <ProfileDetail
              label="Difficulty"
              value={`${metric("difficulty").toFixed(1)} / 5`}
            />
            <Text className="mt-6 text-base font-bold text-ink dark:text-white">
              Recent reviews
            </Text>
            {courseReviews.slice(0, 5).map((review) => (
              <Text
                key={review.id}
                className="mt-3 text-sm leading-5 text-muted"
              >
                "{review.text}"
              </Text>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
function ModerationFilters({
  value,
  onChange,
}: {
  value: ModerationSection;
  onChange: (value: ModerationSection) => void;
}) {
  return (
    <View className="mt-5 flex-row flex-wrap gap-2">
      {(
        ["reports", "questions", "responses", "appeals", "history"] as const
      ).map((item) => (
        <Pressable
          key={item}
          onPress={() => onChange(item)}
          className={`rounded-lg border px-3 py-2 ${value === item ? "border-brand bg-blue-50" : "border-slate-200 dark:border-slate-700"}`}
        >
          <Text className="text-xs font-semibold capitalize text-brand">
            {item === "reports"
              ? "Reported content"
              : item === "questions"
                ? "Questions"
                : item === "responses"
                  ? "Teacher responses"
                  : item}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
function QuestionQueue({ questions }: { questions: CourseQuestion[] }) {
  const pending = questions.filter((question) => !question.answers?.length);
  return pending.length ? (
    <>
      {pending.map((question) => (
        <Card key={question.id} className="mt-3">
          <Text className="text-xs font-bold text-brand">
            {question.category}
          </Text>
          <Text className="mt-2 text-sm leading-5 text-ink dark:text-white">
            {question.text}
          </Text>
          <Text className="mt-2 text-xs text-muted">
            Unanswered | {formatRelativeTime(question.createdAt)}
          </Text>
        </Card>
      ))}
    </>
  ) : (
    <Empty
      title="No unanswered questions"
      body="All course questions currently have at least one answer."
    />
  );
}
function TeacherResponses({
  reviews,
  professorReviews,
}: {
  reviews: Review[];
  professorReviews: ProfessorReview[];
}) {
  const responses = [
    ...reviews.flatMap((review) =>
      (review.responses ?? []).map((response) => ({
        ...response,
        target: "Course review",
      })),
    ),
    ...professorReviews.flatMap((review) =>
      (review.responses ?? []).map((response) => ({
        ...response,
        target: "Teacher review",
      })),
    ),
  ];
  return responses.length ? (
    <>
      {responses.map((response) => (
        <Card key={response.id} className="mt-3">
          <Text className="text-xs font-bold text-brand">
            {response.target} | {response.teacherName}
          </Text>
          <Text className="mt-2 text-sm text-ink dark:text-white">
            {response.text}
          </Text>
          <Text className="mt-2 text-xs text-muted">
            {formatRelativeTime(response.createdAt)}
          </Text>
        </Card>
      ))}
    </>
  ) : (
    <Empty
      title="No teacher responses yet"
      body="Teacher replies to published feedback will appear here for moderation."
    />
  );
}
function AppealList({
  appeals,
  onUpdate,
}: {
  appeals: ModerationAppeal[];
  onUpdate: (id: string, status: ModerationAppeal["status"]) => Promise<void>;
}) {
  return appeals.length ? (
    <>
      {appeals.map((appeal) => (
        <Card key={appeal.id} className="mt-3">
          <Text className="font-semibold text-ink dark:text-white">
            Appeal for report {appeal.reportId}
          </Text>
          <Text className="mt-2 text-sm text-muted">{appeal.reason}</Text>
          <Text className="mt-2 text-xs text-muted">
            {appeal.status.toUpperCase()} |{" "}
            {formatRelativeTime(appeal.createdAt)}
          </Text>
          {appeal.status === "pending" ? (
            <View className="mt-3 flex-row gap-4">
              <Pressable
                onPress={() => {
                  void onUpdate(appeal.id, "accepted");
                }}
              >
                <Text className="text-sm font-semibold text-brand">Accept</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  void onUpdate(appeal.id, "rejected");
                }}
              >
                <Text className="text-sm font-semibold text-rose-600">
                  Reject
                </Text>
              </Pressable>
            </View>
          ) : null}
        </Card>
      ))}
    </>
  ) : (
    <Empty
      title="No appeals yet"
      body="Appeals submitted by community members will appear here."
    />
  );
}
function AdminMenu({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { signOut } = useApp();
  const open = (path: string) => {
    onClose();
    router.push(path as never);
  };
  const logout = async () => {
    onClose();
    await signOut();
    router.replace("/welcome");
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1 bg-black/30" onPress={onClose}>
        <View className="absolute right-5 top-24 w-56 rounded-2xl bg-white p-2 shadow-lg dark:bg-slate-900">
          {[
            ["user", "Admin Profile", "/admin-profile"],
            ["clock", "Activity Log", "/admin-activity"],
            ["settings", "Settings", "/admin-settings"],
            ["lock", "Security", "/admin-security"],
          ].map(([icon, label, path]) => (
            <Pressable
              key={label}
              onPress={() => open(path)}
              className="flex-row items-center gap-3 rounded-xl px-3 py-3"
            >
              <Feather
                name={icon as keyof typeof Feather.glyphMap}
                size={17}
                color="#4F7EF7"
              />
              <Text className="text-sm font-medium text-ink dark:text-white">
                {label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={() => {
              void logout();
            }}
            className="flex-row items-center gap-3 rounded-xl px-3 py-3"
          >
            <Feather name="log-out" size={17} color="#E11D48" />
            <Text className="text-sm font-medium text-rose-600">Logout</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}
function ActivityChart({
  days,
  reviewsOnly = false,
}: {
  days: {
    label: string;
    reviews: number;
    questions: number;
    answers: number;
  }[];
  reviewsOnly?: boolean;
}) {
  const max = Math.max(
    1,
    ...days.flatMap((day) => [day.reviews, day.questions, day.answers]),
  );
  return (
    <View className="mt-5">
      <View className="flex-row items-end justify-between gap-2">
        {days.map((day) => (
          <View key={day.label} className="flex-1 items-center">
            <View className="h-32 w-full flex-row items-end justify-center gap-0.5">
              <View
                style={{
                  height: `${Math.max((day.reviews / max) * 100, day.reviews ? 8 : 2)}%`,
                }}
                className="w-1/4 rounded-t bg-brand"
              />
              {!reviewsOnly ? (
                <View
                  style={{
                    height: `${Math.max((day.questions / max) * 100, day.questions ? 8 : 2)}%`,
                  }}
                  className="w-1/4 rounded-t bg-amber-500"
                />
              ) : null}
              {!reviewsOnly ? (
                <View
                  style={{
                    height: `${Math.max((day.answers / max) * 100, day.answers ? 8 : 2)}%`,
                  }}
                  className="w-1/4 rounded-t bg-emerald-500"
                />
              ) : null}
            </View>
            <Text className="mt-2 text-[10px] text-muted">{day.label}</Text>
          </View>
        ))}
      </View>
      <View className="mt-4 flex-row gap-4">
        <Legend color="bg-brand" label="Reviews" />
        {!reviewsOnly ? (
          <>
            <Legend color="bg-amber-500" label="Questions" />
            <Legend color="bg-emerald-500" label="Answers" />
          </>
        ) : null}
      </View>
    </View>
  );
}
function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View className="flex-row items-center gap-1">
      <View className={`h-2 w-2 rounded-full ${color}`} />
      <Text className="text-xs text-muted">{label}</Text>
    </View>
  );
}
function Search({
  value,
  onChange,
  placeholder = "Search members",
  className = "mt-5",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <View
      className={`${className} flex-row items-center rounded-xl border border-slate-200 bg-white px-3 dark:border-slate-700 dark:bg-slate-900`}
    >
      <Feather name="search" size={17} color="#64748B" />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#64748B"
        className="flex-1 px-2 py-3 text-ink dark:text-white"
      />
    </View>
  );
}

function ReportCard({
  report,
  data,
  onResolved,
}: {
  report: Report;
  data: AdminData;
  onResolved: () => Promise<void>;
}) {
  const questionWithAnswer =
    report.contentType === "answer"
      ? data.questions.find((question) =>
          question.answers?.some((answer) => answer.id === report.contentId),
        )
      : undefined;
  const content =
    report.contentType === "courseReview"
      ? data.reviews.find((item) => item.id === report.contentId)?.text
      : report.contentType === "professorReview"
        ? data.professorReviews.find((item) => item.id === report.contentId)
            ?.text
        : report.contentType === "courseQuestion"
          ? data.questions.find((item) => item.id === report.contentId)?.text
          : questionWithAnswer?.answers?.find(
              (answer) => answer.id === report.contentId,
            )?.text;
  const resolve = async (action: "kept" | "removed") => {
    try {
      if (action === "removed") {
        if (report.contentType === "courseReview")
          await services.deleteReview(report.contentId);
        else if (report.contentType === "professorReview")
          await services.deleteProfessorReview(report.contentId);
        else if (report.contentType === "courseQuestion")
          await services.deleteCourseQuestion(report.contentId);
        else if (report.contentType === "courseGuide")
          await services.deleteCourseGuide(report.contentId);
        else if (questionWithAnswer)
          await services.deleteQuestionAnswer(
            questionWithAnswer.id,
            report.contentId,
          );
      }
      await services.updateReportStatus(report.id, "resolved", action);
      await onResolved();
    } catch (reason) {
      Alert.alert(
        "Could not resolve report",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    }
  };
  return (
    <Card className="mt-3">
      <Text className="text-xs font-bold text-brand">
        REPORT #{report.id.slice(0, 8)} | {report.contentType.toUpperCase()} |{" "}
        {report.status.toUpperCase()}
      </Text>
      <Text className="mt-2 text-xs text-rose-600">
        Category: {report.category}
      </Text>
      {report.description ? (
        <Text className="mt-2 text-sm text-muted">
          Details: {report.description}
        </Text>
      ) : null}
      <Text className="mt-2 leading-5 text-ink dark:text-white">
        {content ?? "The reported content is no longer available."}
      </Text>
      <View className="mt-4 flex-row flex-wrap gap-3">
        <Text
          onPress={() => {
            void resolve("kept");
          }}
          className="text-sm font-semibold text-brand"
        >
          Keep content
        </Text>
        <Text
          onPress={() =>
            Alert.alert(
              "Remove content?",
              "This removes the public record and preserves moderation history.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Remove",
                  style: "destructive",
                  onPress: () => {
                    void resolve("removed");
                  },
                },
              ],
            )
          }
          className="text-sm font-semibold text-rose-600"
        >
          Remove content
        </Text>
      </View>
    </Card>
  );
}
