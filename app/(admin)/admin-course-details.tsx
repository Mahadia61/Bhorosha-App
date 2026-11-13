import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { services } from "@/lib/services/services";
import { useApp } from "@/providers/AppProvider";
import type {
  Course,
  CourseGuide,
  CourseQuestion,
  Review,
} from "@/lib/types/types";

type CourseData = {
  course: Course;
  reviews: Review[];
  questions: CourseQuestion[];
  guides: CourseGuide[];
};

export default function AdminCourseDetails() {
  const { profile } = useApp();
  const { courseId: rawId } = useLocalSearchParams<{
    courseId?: string | string[];
  }>();
  const courseId = Array.isArray(rawId) ? rawId[0] : rawId;
  const [data, setData] = useState<CourseData | null>(null);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!courseId) return;
    try {
      setError("");
      const course = await services.course(courseId);
      if (!course) throw new Error("This course no longer exists.");
      const [reviews, questions, guides] = await Promise.all([
        services.reviews(courseId),
        services.courseQuestions(courseId),
        services.courseGuides(courseId),
      ]);
      setData({ course, reviews, questions, guides });
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Unable to load course details.",
      );
    }
  }, [courseId]);
  useEffect(() => {
    void load();
  }, [load]);
  if (!profile) return <Redirect href="/welcome" />;
  if (profile.role !== "admin") return <Redirect href="/" />;
  const average = data?.reviews.length
    ? data.reviews.reduce((total, review) => total + rating(review), 0) /
      data.reviews.length
    : 0;
  return (
    <SafeAreaView
      className="flex-1 bg-[#F5F6F8] dark:bg-slate-950"
      edges={["left", "right", "bottom"]}
    >
      <ScrollView
        className="flex-1 px-5"
        contentContainerStyle={{ paddingBottom: 112 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="mb-7 mt-3 flex-row items-start gap-3">
          <Pressable
            onPress={() => router.back()}
            className="mt-1 h-10 w-10 items-center justify-center rounded-full border border-[#E7EAF0] bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <Feather name="arrow-left" size={22} color="#172038" />
          </Pressable>
          <View className="flex-1">
            <Text className="text-[26px] font-extrabold tracking-tight text-[#10182F] dark:text-white">
              Course Details
            </Text>
            <Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">
              Course information, feedback, and discussion.
            </Text>
          </View>
        </View>
        {!data && !error ? (
          <View className="items-center py-24">
            <ActivityIndicator color="#0B6BFF" />
            <Text className="mt-3 text-sm text-[#64718B]">
              Loading course details…
            </Text>
          </View>
        ) : error ? (
          <View className="items-center rounded-2xl border border-[#E7EAF0] bg-white p-8">
            <Feather name="alert-circle" size={28} color="#F04455" />
            <Text className="mt-3 text-base font-bold text-[#172038]">
              Course unavailable
            </Text>
            <Text className="mt-2 text-center text-sm text-[#64718B]">
              {error}
            </Text>
            <Pressable
              onPress={() => {
                void load();
              }}
              className="mt-5 rounded-xl bg-[#0B6BFF] px-5 py-3"
            >
              <Text className="font-bold text-white">Try again</Text>
            </Pressable>
          </View>
        ) : data ? (
          <>
            <View className="rounded-3xl border border-[#E7EAF0] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <View className="flex-row items-start">
                <View className="h-16 w-16 items-center justify-center rounded-2xl bg-[#E8F0FE]">
                  <Text className="text-center text-sm font-extrabold text-[#0B6BFF]">
                    {data.course.code.replace(/\s+/, "\n")}
                  </Text>
                </View>
                <View className="ml-4 flex-1">
                  <Text className="text-xl font-extrabold text-[#172038] dark:text-white">
                    {data.course.title}
                  </Text>
                  <Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">
                    {data.course.department} · {data.course.credits} credits
                  </Text>
                  <View
                    className={`mt-3 self-start rounded-full px-3 py-1 ${statusStyle(data.course.status).bg}`}
                  >
                    <Text
                      className={`text-xs font-bold ${statusStyle(data.course.status).text}`}
                    >
                      {statusLabel(data.course.status)}
                    </Text>
                  </View>
                </View>
              </View>
              <Detail
                label="Academic session"
                value={`Level ${data.course.level ?? "—"} · Term ${data.course.term ?? "—"} · ${data.course.courseType ?? "—"}`}
              />
              {data.course.batch ? (
                <Detail label="Batch" value={data.course.batch} />
              ) : null}
              <Detail
                label="Tags"
                value={data.course.tags.join(", ") || "No tags added"}
              />
            </View>
            <Section title="Assigned teachers" icon="users">
              <>
                {data.course.teacherNames.length ? (
                  data.course.teacherNames.map((name) => (
                    <View
                      key={name}
                      className="flex-row items-center border-b border-[#EDF0F5] py-3 last:border-b-0"
                    >
                      <View className="h-9 w-9 items-center justify-center rounded-full bg-[#EEE8FF]">
                        <Text className="font-bold text-[#7540EB]">
                          {name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <Text className="ml-3 flex-1 text-sm font-bold text-[#172038]">
                        {name}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Empty label="No teacher profiles are assigned to this course." />
                )}
              </>
            </Section>
            <Section title="Ratings & reviews" icon="star">
              <View className="flex-row items-center">
                <Text className="text-3xl font-extrabold text-[#172038]">
                  {average ? average.toFixed(1) : "—"}
                </Text>
                <Feather
                  name="star"
                  size={21}
                  color="#F5A623"
                  className="ml-2"
                />
                <Text className="ml-2 text-sm text-[#64718B]">
                  from {data.reviews.length} review
                  {data.reviews.length === 1 ? "" : "s"}
                </Text>
              </View>
              {data.reviews.length ? (
                data.reviews.map((review) => (
                  <View
                    key={review.id}
                    className="border-b border-[#EDF0F5] py-4 last:border-b-0"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-bold text-[#172038]">
                        {review.anonymous
                          ? "Anonymous reviewer"
                          : review.displayName || "Reviewer"}
                      </Text>
                      <Text className="text-sm font-bold text-[#F5A623]">
                        ★ {rating(review).toFixed(1)}
                      </Text>
                    </View>
                    <Text className="mt-2 text-sm leading-5 text-[#64718B]">
                      {review.text}
                    </Text>
                    {review.responses?.map((response) => (
                      <View
                        key={response.id}
                        className="mt-3 rounded-xl bg-[#F3F7FF] p-3"
                      >
                        <Text className="text-xs font-bold text-[#0B6BFF]">
                          {response.teacherName}
                        </Text>
                        <Text className="mt-1 text-sm text-[#46536B]">
                          {response.text}
                        </Text>
                      </View>
                    ))}
                  </View>
                ))
              ) : (
                <Empty label="No reviews have been submitted for this course." />
              )}
            </Section>
            <Section title="Questions & answers" icon="message-circle">
              {data.questions.length ? (
                data.questions.map((question) => (
                  <View
                    key={question.id}
                    className="border-b border-[#EDF0F5] py-4 last:border-b-0"
                  >
                    <Text className="text-xs font-bold text-[#0B6BFF]">
                      {question.category}
                    </Text>
                    <Text className="mt-1 text-sm font-bold text-[#172038]">
                      {question.text}
                    </Text>
                    {question.answers?.length ? (
                      question.answers.map((answer) => (
                        <View
                          key={answer.id}
                          className="mt-3 rounded-xl bg-[#F5F7FA] p-3"
                        >
                          <Text className="text-xs font-bold text-[#64718B]">
                            {answer.authorName} · {answer.authorRole}
                          </Text>
                          <Text className="mt-1 text-sm text-[#46536B]">
                            {answer.text}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text className="mt-2 text-xs text-[#9AA5B8]">
                        No answers yet
                      </Text>
                    )}
                  </View>
                ))
              ) : (
                <Empty label="No questions have been posted for this course." />
              )}
            </Section>
            <Section title="Course guides" icon="file-text">
              {data.guides.length ? (
                data.guides.map((guide) => (
                  <View
                    key={guide.id}
                    className="border-b border-[#EDF0F5] py-4 last:border-b-0"
                  >
                    <Text className="text-sm font-bold text-[#172038]">
                      {guide.title}
                    </Text>
                    <Text className="mt-1 text-sm leading-5 text-[#64718B]">
                      {guide.text}
                    </Text>
                  </View>
                ))
              ) : (
                <Empty label="No course guides have been added." />
              )}
            </Section>
          </>
        ) : null}
      </ScrollView>
      <AdminBottomNav />
    </SafeAreaView>
  );
}

function rating(review: Review) {
  const values = Object.values(review.ratings);
  return values.length
    ? values.reduce((total, value) => total + value, 0) / values.length
    : 0;
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View className="mt-4 border-t border-[#EDF0F5] pt-3 dark:border-slate-800">
      <Text className="text-xs font-semibold text-[#64718B] dark:text-slate-400">
        {label}
      </Text>
      <Text className="mt-1 text-sm font-medium text-[#172038] dark:text-white">
        {value}
      </Text>
    </View>
  );
}
function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: keyof typeof Feather.glyphMap;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-4 rounded-3xl border border-[#E7EAF0] bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <View className="mb-3 flex-row items-center">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-[#E8F0FE]">
          <Feather name={icon} size={18} color="#0B6BFF" />
        </View>
        <Text className="ml-3 text-base font-extrabold text-[#172038] dark:text-white">
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}
function Empty({ label }: { label: string }) {
  return <Text className="py-3 text-sm text-[#64718B]">{label}</Text>;
}
function statusStyle(status?: Course["status"]) {
  return status === "archived"
    ? { bg: "bg-[#EEF2F7]", text: "text-[#64718B]" }
    : status === "draft"
      ? { bg: "bg-[#FFF3DD]", text: "text-[#A86800]" }
      : { bg: "bg-[#E5F9ED]", text: "text-[#138A4C]" };
}
function statusLabel(status?: Course["status"]) {
  return status ? status.charAt(0).toUpperCase() + status.slice(1) : "Active";
}
function AdminBottomNav() {
  const tabs = [
    { label: "Overview", icon: "grid", href: "/(admin-tabs)/overview" },
    { label: "Courses", icon: "book-open", href: "/(admin-tabs)/courses" },
    { label: "Members", icon: "users", href: "/(admin-tabs)/members" },
    { label: "Moderation", icon: "shield", href: "/(admin-tabs)/moderation" },
    {
      label: "Analytics",
      icon: "bar-chart-2",
      href: "/(admin-tabs)/analytics",
    },
  ];
  return (
    <View className="flex-row border-t border-[#E7EAF0] bg-white px-2 pb-5 pt-3 dark:border-slate-800 dark:bg-slate-900">
      {tabs.map((tab) => (
        <Pressable
          key={tab.label}
          onPress={() => router.replace(tab.href as never)}
          className="flex-1 items-center"
        >
          <Feather
            name={tab.icon as keyof typeof Feather.glyphMap}
            size={21}
            color={tab.label === "Courses" ? "#0B6BFF" : "#6C7890"}
          />
          <Text
            className={`mt-1 text-[10px] font-semibold ${tab.label === "Courses" ? "text-[#0B6BFF]" : "text-[#6C7890]"}`}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
