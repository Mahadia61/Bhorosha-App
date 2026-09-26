import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ImageBackground,
  RefreshControl,
  ScrollView,
  Text,
  View,
  Pressable,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  Card,
  CourseCode,
  Empty,
  Screen,
  cardShadowStyle,
} from "@/components/ui/ui";
import { useApp } from "@/providers/AppProvider";
import { courseService } from "@/features/courses";
import { reviewService } from "@/features/reviews";
import { userService } from "@/features/users";
import { academicLabel } from "@/lib/utils/academic";
import type { ActivityItem, Course } from "@/types";

export default function StudentHome() {
  const { profile, isDark } = useApp();
  const [courses, setCourses] = useState<Course[]>([]);
  const [ratings, setRatings] = useState<
    Record<string, { average: number; count: number }>
  >({});
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!profile) return;
    setRefreshing(true);
    setError("");
    try {
      const departmentCourses = (await courseService.courses()).filter(
        (course) => course.department === profile.department,
      );
      const [nextActivity, summaries] = await Promise.all([
        userService.myActivity(profile.id),
        Promise.all(
          departmentCourses.map(async (course) => {
            const reviews = await reviewService.reviews(course.id);
            const average = reviews.length
              ? reviews.reduce(
                  (total, review) =>
                    total +
                    Object.values(review.ratings).reduce(
                      (sum, value) => sum + value,
                      0,
                    ) /
                      Object.values(review.ratings).length,
                  0,
                ) / reviews.length
              : 0;
            return [course.id, { average, count: reviews.length }] as const;
          }),
        ),
      ]);
      setCourses(departmentCourses);
      setActivity(nextActivity);
      setRatings(Object.fromEntries(summaries));
    } catch (reason) {
      setCourses([]);
      setActivity([]);
      setRatings({});
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load your dashboard.",
      );
    } finally {
      setRefreshing(false);
    }
  }, [profile]);

  useEffect(() => {
    void load();
  }, [load]);

  const popularCourses = useMemo(
    () =>
      courses
        .slice()
        .sort(
          (left, right) =>
            (ratings[right.id]?.count ?? 0) - (ratings[left.id]?.count ?? 0),
        )
        .slice(0, 3),
    [courses, ratings],
  );
  const recentCourses = useMemo(() => courses.slice(0, 3), [courses]);
  const openCourse = (id: string) => router.push(`/course/${id}`);

  if (!profile) return null;

  return (
    <Screen>
      <ScrollView
        className="px-5"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={load} />
        }
      >
        {/* ---------- Header: welcome text + bell + avatar ---------- */}
        <View className="mt-3 flex-row items-center justify-between">
          <View className="flex-1 pr-3">
            <Text className="text-sm text-[#64718B] dark:text-slate-400">
              Welcome back,
            </Text>
            <Text
              numberOfLines={1}
              className="mt-0.5 text-2xl font-extrabold text-[#172038] dark:text-white"
            >
              {profile.name}
            </Text>
            <Text className="mt-0.5 text-sm text-[#64718B] dark:text-slate-400">
              {profile.department} ·{" "}
              {academicLabel(
                profile.currentLevel ?? null,
                profile.currentTerm ?? null,
              )}
            </Text>
          </View>
          <View className="flex-row items-center gap-3">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open notifications"
              onPress={() => router.push("/student-notifications" as never)}
              className="relative h-10 w-10 items-center justify-center rounded-full bg-white dark:bg-slate-900"
              style={cardShadowStyle}
            >
              <Feather
                name="bell"
                size={19}
                color={isDark ? "#E2E8F0" : "#111318"}
              />
              <View className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-rose-500" />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open profile"
              onPress={() => router.push("/(tabs)/profile" as never)}
              className="h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800"
            >
              <Text className="text-sm font-bold text-brand">
                {profile.name.trim().charAt(0).toUpperCase()}
              </Text>
            </Pressable>
          </View>
        </View>

        {/* ---------- "Your voice builds a better campus" banner ---------- */}
        <ImageBackground
          source={require("@/assets/images/campus-banner-bg.png")}
          imageStyle={{ borderRadius: 20 }}
          style={{ marginTop: 20, borderRadius: 20, overflow: "hidden" }}
        >
          <View className="p-5" style={{ paddingRight: 96, minHeight: 176 }}>
            <Text className="text-xl font-extrabold leading-6 text-[#0B2A6B]">
              Your voice builds{"\n"}a better campus
            </Text>
            <Text className="mt-2 text-[13px] leading-5 text-[#3E5C85]">
              Share your course experience, ask questions and help others.
            </Text>
            <Pressable
              onPress={() => router.push("/(student-tabs)/courses")}
              className="mt-4 flex-row items-center gap-2 self-start rounded-full bg-brand px-5 py-3"
            >
              <Text className="text-sm font-bold text-white">Share Now</Text>
              <Feather name="arrow-right" size={15} color="#fff" />
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push("/(student-tabs)/courses")}
            className="absolute bottom-3 right-3 h-12 w-12 items-center justify-center rounded-2xl bg-brand"
            style={cardShadowStyle}
          >
            <Feather name="message-circle" size={21} color="#fff" />
          </Pressable>
        </ImageBackground>

        {/* ---------- Quick actions ---------- */}
        <SectionHeading title="Quick actions" />
        <View className="mt-3 flex-row flex-wrap justify-between">
          <QuickActionCard
            icon="book-open"
            iconBg="#EAE0FB"
            iconColor="#7C3AED"
            label="Academic Help"
            detail="Ask about your study plan"
            onPress={() => router.push("/academic-assistant" as never)}
          />
          <QuickActionCard
            icon="book-open"
            iconBg="#DCEAFE"
            iconColor="#1670F8"
            label="My Courses"
            detail="View enrolled courses"
            onPress={() => router.push("/(student-tabs)/courses")}
          />
          <QuickActionCard
            icon="message-circle"
            iconBg="#DCF6E3"
            iconColor="#16A34A"
            label="Give Feedback"
            detail="Share your experience"
            onPress={() => router.push("/(student-tabs)/courses")}
          />
          <QuickActionCard
            icon="help-circle"
            iconBg="#FDECC8"
            iconColor="#D97706"
            label="Ask a Question"
            detail="Get answers from teachers"
            onPress={() => router.push("/(student-tabs)/courses")}
          />
          <QuickActionCard
            icon="compass"
            iconBg="#EAE0FB"
            iconColor="#7C3AED"
            label="Explore Courses"
            detail="Discover new courses"
            onPress={() => router.push("/(student-tabs)/courses")}
          />
        </View>

        {/* ---------- Popular Courses ---------- */}
        <SectionHeading
          title="Popular Courses"
          onPress={() => router.push("/(student-tabs)/courses")}
        />
        <View className="mt-3">
          {popularCourses.length ? (
            <View className="flex-row gap-3">
              {popularCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  rating={ratings[course.id]}
                  onPress={() => openCourse(course.id)}
                />
              ))}
            </View>
          ) : (
            <Empty
              title={error ? "Unable to load courses" : "No courses found"}
              body={error || "Courses for your department will appear here."}
            />
          )}
        </View>

        {/* ---------- Recently Added Courses ---------- */}
        <SectionHeading
          title="Recently Added Courses"
          onPress={() => router.push("/(student-tabs)/courses")}
        />
        <View className="mt-3 flex-row gap-3">
          {recentCourses.map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              rating={ratings[course.id]}
              onPress={() => openCourse(course.id)}
            />
          ))}
        </View>

        {/* ---------- Recent Activity ---------- */}
        <SectionHeading
          title="Recent Activity"
          onPress={() => router.push("/(student-tabs)/activity")}
        />
        <View className="mt-3">
          <Card className="p-0">
            {activity.slice(0, 3).map((item, index) => (
              <Pressable
                key={item.id}
                onPress={() => item.courseId && openCourse(item.courseId)}
                className={`flex-row items-center gap-3 px-4 py-4 ${index ? "border-t border-line dark:border-slate-800" : ""}`}
              >
                <View className="h-10 w-10 items-center justify-center rounded-xl bg-brandSoft dark:bg-slate-800">
                  <Feather
                    name={
                      item.kind === "question" || item.kind === "answer"
                        ? "message-circle"
                        : item.kind === "courseReview"
                          ? "file-text"
                          : "star"
                    }
                    size={18}
                    color="#1670F8"
                  />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-bold text-ink dark:text-white">
                    {activityTitle(item)}
                  </Text>
                  <Text numberOfLines={1} className="mt-1 text-xs text-muted">
                    {item.text}
                  </Text>
                </View>
                <Text className="text-xs text-muted">
                  {relativeTime(item.createdAt)}
                </Text>
              </Pressable>
            ))}
            {!activity.length ? (
              <Text className="px-4 py-5 text-sm text-muted">
                Your reviews, questions, and replies will appear here.
              </Text>
            ) : null}
          </Card>
        </View>
      </ScrollView>
    </Screen>
  );
}

/** Consistent "Title ............ See all" row used above every section, so vertical rhythm stays identical everywhere. */
function SectionHeading({
  title,
  onPress,
}: {
  title: string;
  onPress?: () => void;
}) {
  return (
    <View className="mt-7 flex-row items-center justify-between">
      <Text className="text-base font-extrabold text-[#172038] dark:text-white">
        {title}
      </Text>
      {onPress ? (
        <Pressable onPress={onPress} hitSlop={8}>
          <Text className="text-sm font-bold text-brand">See all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function QuickActionCard({
  icon,
  iconBg,
  iconColor,
  label,
  detail,
  onPress,
}: {
  icon: keyof typeof Feather.glyphMap;
  iconBg: string;
  iconColor: string;
  label: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[{ width: "48%" }, cardShadowStyle]}
      className="mb-3 flex-row items-center justify-between rounded-2xl border border-line bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900"
    >
      <View className="flex-row items-center gap-3">
        <View
          style={{ backgroundColor: iconBg }}
          className="h-11 w-11 items-center justify-center rounded-xl"
        >
          <Feather name={icon} size={19} color={iconColor} />
        </View>
        <View className="shrink">
          <Text
            numberOfLines={1}
            className="text-[13px] font-bold text-[#172038] dark:text-white"
          >
            {label}
          </Text>
          <Text
            numberOfLines={2}
            className="mt-0.5 text-[11px] leading-4 text-[#64718B] dark:text-slate-400"
          >
            {detail}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function CourseCard({
  course,
  rating,
  onPress,
}: {
  course: Course;
  rating?: { average: number; count: number };
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={cardShadowStyle}
      className="min-h-[126px] flex-1 rounded-2xl border border-line bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <CourseCode code={course.code} className="text-xs" />
      <Text
        numberOfLines={2}
        className="mt-2 text-sm font-bold text-ink dark:text-white"
      >
        {course.title}
      </Text>
      <Text className="mt-1 text-xs text-muted">
        {academicLabel(course.level, course.term)}
      </Text>
      <View className="mt-2 flex-row items-center gap-1">
        <Feather name="star" size={12} color="#E0A106" />
        <Text className="text-[10px] text-muted">
          {rating?.count ?? 0} reviews
        </Text>
      </View>
    </Pressable>
  );
}

function activityTitle(item: ActivityItem) {
  return item.kind === "answer"
    ? "Teacher replied to your question"
    : item.kind === "courseReview"
      ? "Your review was posted"
      : item.kind === "question"
        ? "Question submitted"
        : "Teacher review submitted";
}

function relativeTime(timestamp: number) {
  const hours = Math.floor((Date.now() - timestamp) / 3600000);
  if (hours < 1) return "Now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
