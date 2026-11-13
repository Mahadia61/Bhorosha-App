import { teachesCourse } from "@/features/courses";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { Button, Card, CourseCode, Empty, Stars } from "@/components/ui/ui";
import { courseService } from "@/features/courses";
import { questionService } from "@/features/questions";
import { reviewService } from "@/features/reviews";
import { userService } from "@/features/users";
import { defaultRatings } from "@/lib/services/services";
import { summarizeReviews } from "@/lib/utils/ai-summary";
import type { ReviewSummary } from "@/lib/services/ai";
import { useApp } from "@/providers/AppProvider";
import { ReportButton } from "@/components/moderation/ReportButton";
import { academicLabel, questionCategories } from "@/lib/utils/academic";
import type {
  ContentType,
  Course,
  CourseGuide,
  CourseQuestion,
  QuestionCategory,
  RatingMap,
  ReportReason,
  Review,
} from "@/types";

const reportReasons: ReportReason[] = [
  "Spam",
  "Harassment",
  "Inappropriate content",
  "False information",
  "Offensive language",
  "Other",
];
type Section = "overview" | "reviews" | "questions" | "advice";
const sections: { id: Section; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews" },
  { id: "questions", label: "Q&A" },
  { id: "advice", label: "Senior Advice" },
];

export default function CourseDetail() {
  const { id, section: requestedSection } = useLocalSearchParams<{
    id: string;
    section?: string;
  }>();
  const { profile, isDark } = useApp();
  const [section, setSection] = useState<Section>(
    isSection(requestedSection) ? requestedSection : "overview",
  );
  const [course, setCourse] = useState<Course | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [questions, setQuestions] = useState<CourseQuestion[]>([]);
  const [guides, setGuides] = useState<CourseGuide[]>([]);
  const [ownReview, setOwnReview] = useState<Review | null>(null);
  const [reviewText, setReviewText] = useState("");
  const [reviewTags, setReviewTags] = useState<string[]>([]);
  const [aspectRatings, setAspectRatings] = useState<Record<string, number>>({
    "Teaching Quality": 4,
    Workload: 3,
    "Course Structure": 4,
    "Grading Fairness": 4,
    Usefulness: 4,
  });
  const [questionText, setQuestionText] = useState("");
  const [questionCategory, setQuestionCategory] =
    useState<QuestionCategory>("Course Content");
  const [questionAnonymous, setQuestionAnonymous] = useState(true);
  const [anonymous, setAnonymous] = useState(true);
  const [ratings, setRatings] = useState<RatingMap>(defaultRatings);
  const [guideText, setGuideText] = useState("");
  const [guideResources, setGuideResources] = useState("");
  const [guideCategory, setGuideCategory] = useState("Preparation Tips");
  const [guideAnonymous, setGuideAnonymous] = useState(true);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"recent" | "highest">("recent");
  const [page, setPage] = useState(1);
  const [sending, setSending] = useState(false);
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [loadError, setLoadError] = useState("");

  const load = useCallback(async () => {
    try {
      setLoadError("");
      const nextCourse = await courseService.course(id);
      if (!nextCourse) throw new Error("This course is no longer available.");
      if (
        profile?.role === "student" &&
        nextCourse.department !== profile.department
      )
        throw new Error(
          "You can view feedback only for courses in your department.",
        );
      if (profile?.role === "teacher" && !teachesCourse(nextCourse, profile))
        throw new Error(
          "You can view feedback only for your assigned courses.",
        );
      const [nextReviews, nextQuestions, nextGuides, nextOwnReview] =
        await Promise.all([
          reviewService.reviews(id),
          questionService.courseQuestions(id),
          courseService.courseGuides(id),
          profile?.role === "student"
            ? reviewService.myCourseReview(profile.id, id)
            : Promise.resolve(null),
        ]);
      setCourse(nextCourse);
      setReviews(nextReviews);
      setQuestions(nextQuestions);
      setGuides(nextGuides);
      setOwnReview(nextOwnReview);
      if (nextOwnReview) {
        setReviewText(nextOwnReview.text);
        setRatings(nextOwnReview.ratings);
        setAnonymous(nextOwnReview.anonymous);
      }
    } catch (reason) {
      setLoadError(
        reason instanceof Error
          ? reason.message
          : "Unable to load this course.",
      );
    }
  }, [id, profile]);

  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (isSection(requestedSection)) setSection(requestedSection);
  }, [requestedSection]);

  const average = useMemo(
    () =>
      reviews.length
        ? reviews.reduce((sum, review) => sum + reviewAverage(review), 0) /
          reviews.length
        : 0,
    [reviews],
  );
  const filteredReviews = useMemo(
    () =>
      reviews
        .filter((review) =>
          `${review.text} ${review.anonymous ? "anonymous student" : (review.displayName ?? "student")}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )
        .sort((left, right) =>
          sort === "highest"
            ? reviewAverage(right) - reviewAverage(left)
            : right.createdAt - left.createdAt,
        ),
    [reviews, search, sort],
  );
  const reviewPage = filteredReviews.slice(0, page * 5);
  const studentCanContribute = profile?.role === "student";

  const isFormView =
    requestedSection === "review-form" ||
    requestedSection === "question-form" ||
    requestedSection === "advice-form";
  const selectSection = (next: Section) => {
    setSection(next);
    router.setParams({ section: next });
  };
  const submitReview = async () => {
    if (!studentCanContribute)
      return Alert.alert(
        "Student account required",
        "Only students can submit reviews.",
      );
    if (!profile || !reviewText.trim())
      return Alert.alert(
        "Write a review",
        "Please add constructive feedback first.",
      );
    setSending(true);
    try {
      const taggedText = reviewTags.length
        ? `${reviewText.trim()}\n\nTags: ${reviewTags.join(", ")}`
        : reviewText.trim();
      const safeRatings = normalizeRatings(ratings);
      if (ownReview)
        await reviewService.updateReview(ownReview.id, {
          courseId: id,
          text: taggedText,
          ratings: safeRatings,
          anonymous,
        });
      else
        await reviewService.addReview({
          courseId: id,
          text: taggedText,
          ratings: safeRatings,
          anonymous,
        });
      await load();
      setSection("reviews");
      router.setParams({ section: "reviews" });
      Alert.alert(
        ownReview ? "Review updated" : "Review submitted",
        "Your review is now visible in course feedback.",
      );
    } catch (reason) {
      Alert.alert(
        "Could not save review",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };
  const submitQuestion = async () => {
    if (!studentCanContribute)
      return Alert.alert(
        "Student account required",
        "Only students can ask course questions.",
      );
    if (!profile || !questionText.trim())
      return Alert.alert(
        "Write a question",
        "Enter your question for the course teacher.",
      );
    setSending(true);
    try {
      await questionService.addCourseQuestion({
        courseId: id,
        category: questionCategory,
        text: questionText.trim(),
        anonymous: questionAnonymous,
      });
      setQuestionText("");
      setQuestionAnonymous(true);
      await load();
      setSection("questions");
      router.setParams({ section: "questions" });
      Alert.alert("Question posted", "The course teacher can now respond.");
    } catch (reason) {
      Alert.alert(
        "Could not post question",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };
  const submitGuide = async () => {
    if (!studentCanContribute || !guideText.trim())
      return Alert.alert(
        "Complete your advice",
        "Add useful advice for future students.",
      );
    setSending(true);
    try {
      const result = await courseService.addCourseGuide({
        courseId: id,
        category: guideCategory,
        title: guideCategory,
        text: guideText.trim(),
        resources: guideResources.trim(),
        anonymous: guideAnonymous,
      });
      setGuideText("");
      setGuideResources("");
      setGuideAnonymous(true);
      await load();
      setSection("advice");
      router.setParams({ section: "advice" });
      Alert.alert(
        "Advice shared",
        result.categorySaved
          ? "Your advice is now visible to other students."
          : "Your advice was shared, but its topic could not be saved. Deploy the updated Firestore rules to enable advice topics.",
      );
    } catch (reason) {
      Alert.alert(
        "Could not share advice",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };
  const generateSummary = async () => {
    setSummarizing(true);
    try {
      setSummary(await summarizeReviews({ type: "course", id, label: course?.code ?? "this course" }, reviews));
    } catch (reason) {
      Alert.alert(
        "Could not generate summary",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    } finally {
      setSummarizing(false);
    }
  };

  if (loadError)
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 items-center justify-center bg-[#F5F6F8] px-6 dark:bg-slate-950">
        <Text className="text-center text-muted">{loadError}</Text>
      </SafeAreaView>
    );
  if (!course)
    return (
      <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 items-center justify-center bg-[#F5F6F8] dark:bg-slate-950">
        <Text className="text-muted">Loading course…</Text>
      </SafeAreaView>
    );

  return (
    <SafeAreaView edges={["left", "right", "bottom"]} className="flex-1 bg-[#F5F6F8] dark:bg-slate-950">
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 30 }}
      >
        <View className="flex-row items-center justify-between pt-3">
          <Pressable
            onPress={() => router.back()}
            className="flex-row items-center gap-1"
          >
            <Feather
              name="arrow-left"
              size={18}
              color={isDark ? "#E2E8F0" : "#172038"}
            />
            <Text className="text-xs text-[#64718B] dark:text-slate-400">
              {isFormView ? "" : "Back"}
            </Text>
          </Pressable>
          {isFormView ? (
            <Text className="text-base font-extrabold text-[#172038] dark:text-white">
              {requestedSection === "review-form"
                ? "Write a Review"
                : requestedSection === "question-form"
                  ? "Ask a Question"
                  : "Share Your Advice"}
            </Text>
          ) : null}
          <View className="w-8" />
        </View>
        {isFormView ? null : <CourseHeader course={course} />}
        {isFormView ? null : (
          <View className="mt-4 flex-row border-b border-[#E1E6EF] dark:border-slate-800">
            {sections.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => selectSection(item.id)}
                className="flex-1 items-center pb-3"
              >
                <Text
                  className={`text-[10px] font-bold ${section === item.id ? "text-[#1670F8]" : "text-[#64718B] dark:text-slate-400"}`}
                >
                  {item.label}
                </Text>
                {section === item.id ? (
                  <View className="absolute bottom-0 h-0.5 w-full bg-[#1670F8]" />
                ) : null}
              </Pressable>
            ))}
          </View>
        )}
        {requestedSection === "review-form" ? (
          <ReviewForm
            course={course}
            ratings={ratings}
            aspects={aspectRatings}
            tags={reviewTags}
            text={reviewText}
            anonymous={anonymous}
            ownReview={ownReview}
            onRatings={setRatings}
            onAspects={setAspectRatings}
            onTags={setReviewTags}
            onText={setReviewText}
            onAnonymous={setAnonymous}
            onSubmit={() => {
              void submitReview();
            }}
            sending={sending}
          />
        ) : requestedSection === "question-form" ? (
          <QuestionForm
            course={course}
            category={questionCategory}
            text={questionText}
            anonymous={questionAnonymous}
            onCategory={setQuestionCategory}
            onText={setQuestionText}
            onAnonymous={setQuestionAnonymous}
            onSubmit={() => {
              void submitQuestion();
            }}
            sending={sending}
          />
        ) : requestedSection === "advice-form" ? (
          <AdviceForm
            course={course}
            category={guideCategory}
            text={guideText}
            resources={guideResources}
            anonymous={guideAnonymous}
            onCategory={setGuideCategory}
            onText={setGuideText}
            onResources={setGuideResources}
            onAnonymous={setGuideAnonymous}
            onSubmit={() => {
              void submitGuide();
            }}
            sending={sending}
          />
        ) : (
          <>
            {section === "overview" ? (
              <Overview
                course={course}
                average={average}
                reviews={reviews}
                summary={summary}
                summarizing={summarizing}
                onSummary={() => {
                  void generateSummary();
                }}
                onReviews={() => selectSection("reviews")}
              />
            ) : null}
            {section === "reviews" ? (
              <Reviews
                reviews={reviewPage}
                total={filteredReviews.length}
                search={search}
                sort={sort}
                onSearch={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
                onSort={() =>
                  setSort((value) =>
                    value === "recent" ? "highest" : "recent",
                  )
                }
                onMore={() => setPage((value) => value + 1)}
                profile={profile}
              />
            ) : null}
            {section === "questions" ? (
              <Questions
                questions={questions}
                profile={profile}
                onPosted={load}
              />
            ) : null}
            {section === "advice" ? (
              <Advice
                guides={guides}
              />
            ) : null}
          </>
        )}
      </ScrollView>
      {isFormView ? null : (
        <View className="flex-row gap-3 border-t border-[#E7EAF0] bg-white px-4 pb-2 pt-3 dark:border-slate-800 dark:bg-slate-900">
          <Button
            className="flex-1 px-1"
            onPress={() =>
              router.push(`/course/${id}?section=review-form` as never)
            }
          >
            Write Review
          </Button>
          <Button
            className="flex-1 px-1"
            variant="outline"
            onPress={() =>
              router.push(`/course/${id}?section=question-form` as never)
            }
          >
            Ask Q&A
          </Button>
          <Button
            className="flex-1 px-1"
            variant="outline"
            onPress={() =>
              router.push(`/course/${id}?section=advice-form` as never)
            }
          >
            Senior Advice
          </Button>
        </View>
      )}
      <CourseBottomNav />
    </SafeAreaView>
  );
}

function CourseHeader({ course }: { course: Course }) {
  return (
    <View className="mt-4">
      <View className="flex-row items-start gap-3">
        <View className="h-16 w-16 items-center justify-center rounded-xl bg-blue-100 dark:bg-slate-800">
          <CourseCode code={course.code} className="text-sm" />
        </View>
        <View className="flex-1">
          <Text className="text-lg font-extrabold leading-6 text-[#172038] dark:text-white">
            {course.title}
          </Text>
          <Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">
            {course.department} · {academicLabel(course.level, course.term)}
          </Text>
          <View className="mt-2 flex-row flex-wrap gap-x-3 gap-y-1">
            <Meta
              icon="book-open"
              text={course.level ? `Level ${course.level}` : "Level —"}
            />
            <Meta
              icon="calendar"
              text={course.term ? `Term ${course.term}` : "Term —"}
            />
            <Meta icon="clock" text={`${course.credits} credits`} />
          </View>
        </View>
      </View>
      <View className="mt-3 flex-row flex-wrap gap-1.5">
        {course.tags.map((tag) => (
          <Text
            key={tag}
            className="rounded-md bg-blue-50 px-2 py-1 text-[10px] font-semibold text-brand dark:bg-slate-800"
          >
            {tag}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Overview({
  course,
  average,
  reviews,
  summary,
  summarizing,
  onSummary,
  onReviews,
}: {
  course: Course;
  average: number;
  reviews: Review[];
  summary: ReviewSummary | null;
  summarizing: boolean;
  onSummary: () => void;
  onReviews: () => void;
}) {
  const distribution = [5, 4, 3, 2, 1].map(
    (stars) =>
      reviews.filter((review) => Math.round(reviewAverage(review)) === stars)
        .length,
  );
  return (
    <View>
      <View className="mt-6 flex-row items-center justify-between">
        <Text className="text-base font-extrabold text-[#172038] dark:text-white">
          Teachers
        </Text>
        <Pressable onPress={onReviews}>
          <Text className="text-xs font-bold text-brand">See all</Text>
        </Pressable>
      </View>
      <Card className="mt-3">
        {course.teacherNames.length ? (
          course.teacherNames.map((teacher, index) => (
            <View
              key={teacher}
              className={`flex-row items-center py-2 ${index ? "border-t border-slate-100 dark:border-slate-800" : ""}`}
            >
              <View className="h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800">
                <Text className="font-bold text-brand">
                  {teacher.charAt(0)}
                </Text>
              </View>
              <Text className="ml-3 flex-1 text-sm font-semibold text-[#172038] dark:text-white">
                {teacher}
              </Text>
              <Feather name="mail" size={16} color="#64718B" />
            </View>
          ))
        ) : (
          <Text className="text-sm text-muted">
            Teacher assignment pending.
          </Text>
        )}
      </Card>
      <View className="mt-5 flex-row items-center justify-between">
        <Text className="text-base font-extrabold text-[#172038] dark:text-white">
          About this course
        </Text>
        <Pressable
          onPress={onSummary}
          className="rounded-lg bg-blue-50 px-2 py-1.5 dark:bg-slate-800"
        >
          <Text className="text-[10px] font-bold text-brand">
            {summarizing ? "Preparing…" : "AI Summary"}
          </Text>
        </Pressable>
      </View>
      <Card className="mt-3">
        <Text className="text-sm leading-5 text-[#52627A] dark:text-slate-300">
          Explore the core concepts, practical applications, and collaborative
          work covered in {course.title}. Your course teacher can share the most
          current guidance and expectations.
        </Text>
        {summary ? (
          <View className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-slate-800">
            <Text className="text-xs font-bold text-brand">
              AI COURSE SUMMARY
            </Text>
            <Text className="mt-1 text-sm leading-5 text-[#52627A] dark:text-slate-300">
              {summary.summary}
            </Text>
            <Text className="mt-2 text-[10px] font-bold uppercase text-[#52627A] dark:text-slate-300">
              Sentiment: {summary.sentiment}
            </Text>
            {summary.positivePoints.length ? <Text className="mt-2 text-xs leading-5 text-[#52627A] dark:text-slate-300">Positive: {summary.positivePoints.join(" • ")}</Text> : null}
            {summary.negativePoints.length ? <Text className="mt-1 text-xs leading-5 text-[#52627A] dark:text-slate-300">Needs attention: {summary.negativePoints.join(" • ")}</Text> : null}
          </View>
        ) : null}
      </Card>
      <Text className="mt-5 text-base font-extrabold text-[#172038] dark:text-white">
        Community Feedback
      </Text>
      <Card className="mt-3">
        <View className="flex-row items-center gap-3">
          <Text className="text-3xl font-extrabold text-[#172038] dark:text-white">
            {average ? average.toFixed(1) : "—"}
          </Text>
          <View>
            <Stars value={average} />
            <Text className="mt-1 text-xs text-muted">
              Based on {reviews.length} reviews
            </Text>
          </View>
        </View>
        {distribution.map((count, index) => (
          <RatingBar
            key={count + index}
            stars={5 - index}
            count={count}
            total={reviews.length}
          />
        ))}
      </Card>
    </View>
  );
}

function RatingBar({
  stars,
  count,
  total,
}: {
  stars: number;
  count: number;
  total: number;
}) {
  const percentage = total ? Math.round((count / total) * 100) : 0;
  return (
    <View className="mt-2 flex-row items-center gap-2">
      <Text className="w-6 text-[10px] text-muted">{stars} ★</Text>
      <View className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <View
          className="h-full rounded-full bg-[#1670F8]"
          style={{ width: `${percentage}%` }}
        />
      </View>
      <Text className="w-12 text-right text-[10px] text-muted">
        {count} ({percentage}%)
      </Text>
    </View>
  );
}

function Reviews({
  reviews,
  total,
  search,
  sort,
  onSearch,
  onSort,
  onMore,
  profile,
}: {
  reviews: Review[];
  total: number;
  search: string;
  sort: "recent" | "highest";
  onSearch: (value: string) => void;
  onSort: () => void;
  onMore: () => void;
  profile: ReturnType<typeof useApp>["profile"];
}) {
  return (
    <View>
      <View className="mt-5 flex-row items-center rounded-xl border border-[#E7EAF0] bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
        <Feather name="search" size={16} color="#64718B" />
        <TextInput
          value={search}
          onChangeText={onSearch}
          placeholder="Search reviews…"
          placeholderTextColor="#94A3B8"
          className="flex-1 px-3 py-2.5 text-sm text-[#172038] dark:text-white"
        />
      </View>
      <View className="mt-3">
        <Pressable
          onPress={onSort}
          className="flex-row items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900"
        >
          <Text className="text-xs text-muted">
            Sort: {sort === "recent" ? "Most recent" : "Highest rated"}
          </Text>
          <Feather name="chevron-down" size={15} color="#64718B" />
        </Pressable>
      </View>
      {reviews.length ? (
        reviews.map((review) => (
          <ReviewCard key={review.id} review={review} profile={profile} />
        ))
      ) : (
        <Empty
          title="No reviews found"
          body="Be the first to share feedback for this course."
        />
      )}
      {reviews.length < total ? (
        <Pressable
          onPress={onMore}
          className="mt-4 items-center rounded-xl border border-brand py-3"
        >
          <Text className="text-sm font-bold text-brand">
            Load more reviews
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function FormTitle({ title }: { title: string }) {
  return (
    <View className="mt-4 flex-row items-center gap-2">
      <Pressable onPress={() => router.back()}>
        <Feather name="arrow-left" size={20} color="#172038" />
      </Pressable>
      <Text className="text-base font-extrabold text-[#172038] dark:text-white">
        {title}
      </Text>
    </View>
  );
}

function ReviewForm({
  course,
  ratings,
  aspects,
  tags,
  text,
  anonymous,
  ownReview,
  onRatings,
  onAspects,
  onTags,
  onText,
  onAnonymous,
  onSubmit,
  sending,
}: {
  course: Course;
  ratings: RatingMap;
  aspects: Record<string, number>;
  tags: string[];
  text: string;
  anonymous: boolean;
  ownReview: Review | null;
  onRatings: (value: RatingMap) => void;
  onAspects: (value: Record<string, number>) => void;
  onTags: (value: string[]) => void;
  onText: (value: string) => void;
  onAnonymous: (value: boolean) => void;
  onSubmit: () => void;
  sending: boolean;
}) {
  const aspectNames = [
    "Teaching Quality",
    "Workload",
    "Course Structure",
    "Grading Fairness",
    "Usefulness",
  ];
  const tagOptions = [
    "Practical",
    "Well structured",
    "Challenging",
    "Useful",
    "Interesting",
    "Needs more resources",
  ];
  return (
    <View>
      <MiniCourseCard course={course} />
      <Text className="mt-5 text-xs font-extrabold text-[#172038] dark:text-white">
        Your Identity
      </Text>
      <View className="mt-2 flex-row gap-2">
        <ChoiceCard
          active={anonymous}
          title="Anonymous"
          body="Your name will not be shown to other students."
          onPress={() => onAnonymous(true)}
        />
        <ChoiceCard
          active={!anonymous}
          title="Named"
          body="Your name and department will be shown."
          onPress={() => onAnonymous(false)}
        />
      </View>
      <Text className="mt-5 text-xs font-extrabold text-[#172038] dark:text-white">
        Overall Rating
      </Text>
      <View className="mt-2 flex-row items-center gap-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable
            key={value}
            onPress={() =>
              onRatings({
                ...ratings,
                learningValue: value,
                teachingQuality: value,
              })
            }
          >
            <Feather
              name="star"
              size={28}
              color={value <= ratings.learningValue ? "#F59E0B" : "#DCE1E8"}
            />
          </Pressable>
        ))}
        <Text className="text-xs text-muted">{ratings.learningValue}/5</Text>
      </View>
      <Text className="mt-5 text-xs font-extrabold text-[#172038] dark:text-white">
        Rate Aspects <Text className="font-normal text-muted">(Optional)</Text>
      </Text>
      {aspectNames.map((name) => (
        <RatingRow
          key={name}
          name={name}
          value={aspects[name] ?? 0}
          onChange={(value) => onAspects({ ...aspects, [name]: value })}
        />
      ))}
      <Text className="mt-5 text-xs font-extrabold text-[#172038] dark:text-white">
        Your Review
      </Text>
      <TextInput
        multiline
        value={text}
        onChangeText={onText}
        maxLength={1000}
        placeholder="Share your experience with this course. What did you like? What could be improved? Any tips for future students?"
        placeholderTextColor="#64718B"
        textAlignVertical="top"
        className="mt-2 min-h-24 rounded-xl border border-slate-200 bg-white p-3 text-sm leading-5 text-ink dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
      <Text className="mt-1 text-right text-[10px] text-muted">
        {text.length}/1000
      </Text>
      <Text className="mt-5 text-xs font-extrabold text-[#172038] dark:text-white">
        Tags <Text className="font-normal text-muted">(Optional)</Text>
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {tagOptions.map((tag) => (
          <Pressable
            key={tag}
            onPress={() =>
              onTags(
                tags.includes(tag)
                  ? tags.filter((item) => item !== tag)
                  : [...tags, tag],
              )
            }
            className={`rounded-lg px-3 py-2 ${tags.includes(tag) ? "bg-blue-100" : "bg-slate-100 dark:bg-slate-800"}`}
          >
            <Text className="text-[10px] text-muted">{tag}</Text>
          </Pressable>
        ))}
      </View>
      <Button className="mt-5" loading={sending} onPress={onSubmit}>
        {ownReview ? "Update Review" : "Submit Review"}
      </Button>
    </View>
  );
}

function QuestionForm({
  course,
  category,
  text,
  anonymous,
  onCategory,
  onText,
  onAnonymous,
  onSubmit,
  sending,
}: {
  course: Course;
  category: QuestionCategory;
  text: string;
  anonymous: boolean;
  onCategory: (value: QuestionCategory) => void;
  onText: (value: string) => void;
  onAnonymous: (value: boolean) => void;
  onSubmit: () => void;
  sending: boolean;
}) {
  const categories = questionCategories.filter(
    (item) => item !== "Registration",
  );
  return (
    <View>
      <MiniCourseCard course={course} />
      <IdentityChoice anonymous={anonymous} onChange={onAnonymous} label="Question Identity" />
      <Text className="mt-5 text-xs font-extrabold text-[#172038] dark:text-white">
        Question Category
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {categories.map((item) => (
          <Pressable
            key={item}
            onPress={() => onCategory(item)}
            className={`rounded-lg px-3 py-2 ${category === item ? "bg-[#1670F8]" : "bg-slate-100 dark:bg-slate-800"}`}
          >
            <Text
              className={`text-[10px] font-semibold ${category === item ? "text-white" : "text-muted"}`}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text className="mt-5 text-xs font-extrabold text-[#172038] dark:text-white">
        Your Question
      </Text>
      <TextInput
        multiline
        value={text}
        onChangeText={onText}
        maxLength={1000}
        placeholder="Type your question in detail. Be clear and specific so that your teacher and other students can understand it easily."
        placeholderTextColor="#64718B"
        textAlignVertical="top"
        className="mt-2 min-h-24 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
      <Text className="text-right text-[10px] text-muted">
        {text.length}/1000
      </Text>
      <Card className="mt-3 border-blue-100 bg-blue-50 dark:border-slate-800 dark:bg-slate-900">
        <View className="flex-row gap-2">
          <Feather name="info" size={17} color="#1670F8" />
          <View className="flex-1">
            <Text className="text-xs font-bold text-brand">
              Tips for a good question
            </Text>
            <Text className="mt-1 text-[10px] leading-4 text-[#52627A] dark:text-slate-300">
              • Be clear and specific.{"\n"}• Mention what you have already
              tried.{"\n"}• Use proper formatting for code or equations.
            </Text>
          </View>
        </View>
      </Card>
      <Button className="mt-5" loading={sending} onPress={onSubmit}>
        Post Question
      </Button>
    </View>
  );
}

function IdentityChoice({
  anonymous,
  onChange,
  label,
}: {
  anonymous: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <>
      <Text className="mt-5 text-xs font-extrabold text-[#172038] dark:text-white">
        {label}
      </Text>
      <View className="mt-2 flex-row gap-2">
        <ChoiceCard
          active={anonymous}
          title="Anonymous"
          body="Your name will not be shown."
          onPress={() => onChange(true)}
        />
        <ChoiceCard
          active={!anonymous}
          title="Named"
          body="Your name will be shown."
          onPress={() => onChange(false)}
        />
      </View>
    </>
  );
}

function AdviceForm({
  course,
  category,
  text,
  resources,
  anonymous,
  onCategory,
  onText,
  onResources,
  onAnonymous,
  onSubmit,
  sending,
}: {
  course: Course;
  category: string;
  text: string;
  resources: string;
  anonymous: boolean;
  onCategory: (value: string) => void;
  onText: (value: string) => void;
  onResources: (value: string) => void;
  onAnonymous: (value: boolean) => void;
  onSubmit: () => void;
  sending: boolean;
}) {
  const categories = [
    "Preparation Tips",
    "Recommended Books",
    "Project Ideas",
    "Difficulty Level",
    "Study Strategy",
    "General Advice",
  ];
  return (
    <View>
      <MiniCourseCard course={course} />
      <IdentityChoice anonymous={anonymous} onChange={onAnonymous} label="Advice Identity" />
      <Text className="mt-5 text-xs font-extrabold text-[#172038] dark:text-white">
        Advice Category
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {categories.map((item) => (
          <Pressable
            key={item}
            onPress={() => onCategory(item)}
            className={`rounded-lg px-3 py-2 ${category === item ? "bg-[#1670F8]" : "bg-slate-100 dark:bg-slate-800"}`}
          >
            <Text
              className={`text-[10px] ${category === item ? "text-white" : "text-muted"}`}
            >
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text className="mt-5 text-xs font-extrabold text-[#172038] dark:text-white">
        Your Advice
      </Text>
      <TextInput
        multiline
        value={text}
        onChangeText={onText}
        maxLength={1500}
        placeholder="Share your advice, tips, resources or experiences for future students. Be as detailed as possible."
        placeholderTextColor="#64718B"
        textAlignVertical="top"
        className="mt-2 min-h-28 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-5 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
      />
      <Text className="text-right text-[10px] text-muted">
        {text.length}/1500
      </Text>
      <Text className="mt-5 text-xs font-extrabold text-[#172038] dark:text-white">
        Tags <Text className="font-normal text-muted">(Optional)</Text>
      </Text>
      <View className="mt-2 flex-row flex-wrap gap-2">
        {[
          "Study Plan",
          "Important Topics",
          "Useful Resources",
          "Project Guidance",
          "Exam Tips",
          "Other",
        ].map((tag) => (
          <Pressable
            key={tag}
            onPress={() => onResources(resources === tag ? "" : tag)}
            className={`rounded-lg px-3 py-2 ${resources === tag ? "bg-blue-100" : "bg-slate-100 dark:bg-slate-800"}`}
          >
            <Text className="text-[10px] text-muted">{tag}</Text>
          </Pressable>
        ))}
      </View>
      <Card className="mt-3 border-blue-100 bg-blue-50 dark:border-slate-800 dark:bg-slate-900">
        <View className="flex-row gap-2">
          <Feather name="life-buoy" size={17} color="#1670F8" />
          <View className="flex-1">
            <Text className="text-xs font-bold text-brand">
              Help future juniors
            </Text>
            <Text className="mt-1 text-[10px] leading-4 text-[#52627A] dark:text-slate-300">
              Your advice can make a big difference for students taking this
              course next.
            </Text>
          </View>
        </View>
      </Card>
      <Button className="mt-5" loading={sending} onPress={onSubmit}>
        Submit Advice
      </Button>
    </View>
  );
}

function MiniCourseCard({ course }: { course: Course }) {
  return (
    <View className="mt-4 flex-row items-center border-b border-slate-100 pb-4 dark:border-slate-800">
      <View className="h-16 w-16 items-center justify-center rounded-xl bg-blue-100 dark:bg-slate-800">
        <CourseCode code={course.code} className="text-sm" />
      </View>
      <View className="ml-3 flex-1">
        <Text className="text-lg font-extrabold leading-6 text-[#172038] dark:text-white">
          {course.title}
        </Text>
        <Text className="mt-1 text-sm text-[#64718B] dark:text-slate-400">
          Department of {course.department}
        </Text>
        <View className="mt-2 flex-row flex-wrap gap-3">
          <Meta icon="book-open" text={`Level ${course.level ?? "—"}`} />
          <Meta icon="calendar" text={`Term ${course.term ?? "—"}`} />
        </View>
      </View>
    </View>
  );
}

function ChoiceCard({
  active,
  title,
  body,
  onPress,
}: {
  active: boolean;
  title: string;
  body: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-1 rounded-xl border p-3 ${active ? "border-brand bg-blue-50 dark:bg-blue-950" : "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"}`}
    >
      <View className="flex-row items-center gap-2">
        <View
          className={`h-4 w-4 items-center justify-center rounded-full border-2 ${active ? "border-brand bg-brand" : "border-slate-300"}`}
        >
          {active ? <Feather name="check" size={10} color="#FFFFFF" /> : null}
        </View>
        <Text className="text-xs font-bold text-[#172038] dark:text-white">
          {title}
        </Text>
      </View>
      <Text className="mt-2 text-[10px] leading-4 text-muted">{body}</Text>
    </Pressable>
  );
}

function RatingRow({
  name,
  value,
  onChange,
}: {
  name: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View className="mt-2 flex-row items-center justify-between">
      <Text className="text-xs text-[#52627A] dark:text-slate-300">{name}</Text>
      <View className="flex-row gap-1">
        {[1, 2, 3, 4, 5].map((item) => (
          <Pressable key={item} onPress={() => onChange(item)}>
            <Feather
              name="star"
              size={16}
              color={item <= value ? "#F59E0B" : "#CBD5E1"}
            />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Questions({
  questions,
  profile,
  onPosted,
}: {
  questions: CourseQuestion[];
  profile: ReturnType<typeof useApp>["profile"];
  onPosted: () => Promise<void>;
}) {
  return (
    <View>
      <View className="mt-3 flex-row items-center rounded-xl border border-[#E7EAF0] bg-white px-3 dark:border-slate-800 dark:bg-slate-900">
        <Feather name="search" size={16} color="#64718B" />
        <TextInput
          placeholder="Search questions…"
          placeholderTextColor="#94A3B8"
          className="flex-1 px-3 py-2.5 text-sm text-[#172038] dark:text-white"
        />
      </View>
      {questions.length ? (
        questions.map((question) => (
          <QuestionCard
            key={question.id}
            question={question}
            profile={profile}
            onPosted={onPosted}
          />
        ))
      ) : (
        <Empty
          title="No questions yet"
          body="Ask the first question about this course."
        />
      )}
    </View>
  );
}

function Advice({
  guides,
}: {
  guides: CourseGuide[];
}) {
  return (
    <View>
      <Card className="mt-5 border-blue-100 bg-blue-50 dark:border-slate-800 dark:bg-slate-900">
        <View className="flex-row gap-3">
          <Feather name="award" size={21} color="#1670F8" />
          <Text className="flex-1 text-sm leading-5 text-[#52627A] dark:text-slate-300">
            Tips, resources and guidance from seniors who have already taken
            this course.
          </Text>
        </View>
      </Card>
      <Text className="mt-6 text-base font-extrabold text-[#172038] dark:text-white">
        Popular Topics
      </Text>
      <View className="mt-3 flex-row flex-wrap gap-2">
        {[
          "Preparation Tips",
          "Difficulty Level",
          "Recommended Books",
          "Project Ideas",
          "Study Strategy",
          "General Advice",
        ].map((item) => (
          <Text
            key={item}
            className="rounded-xl bg-white px-3 py-2 text-xs text-muted dark:bg-slate-900"
          >
            {item}
          </Text>
        ))}
      </View>
      {guides.map((guide) => (
        <Card key={guide.id} className="mt-3">
          <View className="flex-row items-center gap-3">
            <View className="h-9 w-9 items-center justify-center rounded-full bg-blue-100 dark:bg-slate-800">
              <Text className="font-bold text-brand">
                {guide.title.charAt(0)}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="font-bold text-[#172038] dark:text-white">
                {guide.title}
              </Text>
              <Text className="text-xs text-muted">
                {guide.category ? `${guide.category} · ` : ""}
                {guide.anonymous === false
                  ? guide.displayName ?? "Named student"
                  : "Shared by a senior student"}
              </Text>
            </View>
            <ReportButton contentType="courseGuide" contentId={guide.id} />
          </View>
          <Text className="mt-3 leading-5 text-[#52627A] dark:text-slate-300">
            {guide.text}
          </Text>
          {guide.resources ? (
            <Text className="mt-2 text-xs font-semibold text-brand">
              Resources: {guide.resources}
            </Text>
          ) : null}
        </Card>
      ))}
    </View>
  );
}

function QuestionCard({
  question,
  profile,
  onPosted,
}: {
  question: CourseQuestion;
  profile: ReturnType<typeof useApp>["profile"];
  onPosted: () => Promise<void>;
}) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const report = async (
    contentType: ContentType,
    contentId: string,
    questionId?: string,
  ) => {
    const reason = await chooseReportReason();
    if (!reason) return;
    try {
      await userService.reportContent(contentType, contentId, reason, questionId);
      Alert.alert("Report submitted", "An administrator will review it.");
    } catch (reason) {
      Alert.alert(
        "Could not report content",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    }
  };
  const reply = async () => {
    if (!profile || profile.role !== "student" || !draft.trim()) return;
    setSending(true);
    try {
      await questionService.addQuestionAnswer(question.id, profile, draft);
      setDraft("");
      await onPosted();
    } catch (reason) {
      Alert.alert(
        "Could not post answer",
        reason instanceof Error ? reason.message : "Please try again.",
      );
    } finally {
      setSending(false);
    }
  };
  return (
    <Card className="mt-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs font-bold text-brand">
          {question.category.toUpperCase()}
        </Text>
        <ReportButton contentType="courseQuestion" contentId={question.id} />
      </View>
      <Text className="mt-2 text-sm leading-5 text-[#52627A] dark:text-slate-300">
        {question.text}
      </Text>
      {question.answers?.map((answer) => (
        <View
          key={answer.id}
          className="mt-3 rounded-xl bg-blue-50 p-3 dark:bg-slate-800"
        >
          <View className="flex-row justify-between">
            <Text className="text-xs font-bold text-brand">
              {answer.authorRole === "teacher"
                ? "TEACHER RESPONSE"
                : "STUDENT RESPONSE"}
            </Text>
            <ReportButton
              contentType="answer"
              contentId={answer.id}
              questionId={question.id}
            />
          </View>
          <Text className="mt-1 text-sm text-[#52627A] dark:text-slate-300">
            {answer.text}
          </Text>
        </View>
      ))}
      {!question.answers?.length ? (
        <Text className="mt-3 text-xs text-muted">
          Awaiting a teacher response
        </Text>
      ) : null}
      {profile?.role === "student" ? (
        <View className="mt-3">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Reply helpfully"
            placeholderTextColor="#94A3B8"
            className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-700 dark:text-white"
          />
          <Button
            className="mt-2"
            variant="outline"
            loading={sending}
            onPress={reply}
          >
            Post answer
          </Button>
        </View>
      ) : null}
    </Card>
  );
}

function ReviewCard({
  review,
  profile,
}: {
  review: Review;
  profile: ReturnType<typeof useApp>["profile"];
}) {
  return (
    <Card className="mt-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <View className="h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
            <Text className="font-bold text-slate-600 dark:text-slate-200">
              {review.anonymous ? "A" : (review.displayName ?? "S").charAt(0)}
            </Text>
          </View>
          <View>
            <Text className="text-sm font-bold text-[#172038] dark:text-white">
              {review.anonymous
                ? "Anonymous"
                : (review.displayName ?? "Student")}
            </Text>
            <Text className="text-xs text-muted">
              {new Date(review.createdAt).toLocaleDateString()}
            </Text>
          </View>
        </View>
        <Stars value={reviewAverage(review)} />
      </View>
      <Text className="mt-3 leading-5 text-[#52627A] dark:text-slate-300">
        {review.text}
      </Text>
      <View className="mt-3 flex-row items-center justify-between">
        <Text className="text-xs text-muted">
          Helpful · {review.ratings.learningValue}/5 learning value
        </Text>
        {profile?.role !== "admin" ? (
          <ReportButton contentType="courseReview" contentId={review.id} />
        ) : null}
      </View>
    </Card>
  );
}

async function reportReview(id: string) {
  const reason = await chooseReportReason();
  if (!reason) return;
  try {
    await userService.reportContent("courseReview", id, reason);
    Alert.alert("Report submitted", "An administrator will review it.");
  } catch (error) {
    Alert.alert(
      "Could not report review",
      error instanceof Error ? error.message : "Please try again.",
    );
  }
}
function reviewAverage(review: Review) {
  const values = Object.values(review.ratings);
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function normalizeRatings(value: RatingMap): RatingMap {
  return Object.fromEntries(
    Object.entries(defaultRatings).map(([key, fallback]) => [
      key,
      Math.max(
        1,
        Math.min(
          5,
          Math.round(Number(value[key as keyof RatingMap] ?? fallback)),
        ),
      ),
    ]),
  ) as RatingMap;
}
function isSection(value: string | undefined): value is Section {
  return (
    value === "overview" ||
    value === "reviews" ||
    value === "questions" ||
    value === "advice"
  );
}
function Meta({
  icon,
  text,
}: {
  icon: keyof typeof Feather.glyphMap;
  text: string;
}) {
  return (
    <View className="flex-row items-center gap-1">
      <Feather name={icon} size={12} color="#71809A" />
      <Text className="text-[10px] text-[#64718B] dark:text-slate-400">
        {text}
      </Text>
    </View>
  );
}
function Insight({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-1 items-center rounded-xl bg-white p-3 dark:bg-slate-900">
      <Feather name={icon} size={18} color="#1670F8" />
      <Text className="mt-1 text-xs font-bold text-[#172038] dark:text-white">
        {value}
      </Text>
      <Text className="mt-1 text-[10px] text-muted">{label}</Text>
    </View>
  );
}
function chooseReportReason(): Promise<ReportReason | null> {
  return new Promise((resolve) =>
    Alert.alert("Report content", "Choose a reason", [
      ...reportReasons.map((reason) => ({
        text: reason,
        onPress: () => resolve(reason),
      })),
      { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
    ]),
  );
}
function CourseBottomNav() {
  const tabs = [
    { label: "Home", icon: "home", href: "/(student-tabs)/home" },
    { label: "Courses", icon: "book-open", href: "/(student-tabs)/courses" },
    { label: "Teachers", icon: "users", href: "/(student-tabs)/professors" },
    { label: "Feedback", icon: "star", href: "/my-reviews" },
    { label: "Activity", icon: "clock", href: "/(student-tabs)/activity" },
  ] as const;
  return (
    <View className="flex-row border-t border-[#E7EAF0] bg-white px-1 pb-3 pt-2 dark:border-slate-800 dark:bg-slate-900">
      {tabs.map((tab) => (
        <Pressable
          key={tab.label}
          onPress={() => router.replace(tab.href as never)}
          className="flex-1 items-center"
        >
          <Feather
            name={tab.icon}
            size={20}
            color={tab.label === "Courses" ? "#1670F8" : "#7A879A"}
          />
          <Text
            className={`mt-1 text-[10px] font-semibold ${tab.label === "Courses" ? "text-[#1670F8]" : "text-[#7A879A]"}`}
          >
            {tab.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
