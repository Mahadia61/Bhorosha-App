import { courseService, teachesCourse } from "@/features/courses";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import {
  academicLabel,
  academicLevels,
  academicTerms,
  courseTypes,
} from "@/lib/utils/academic";
import {
  CourseCode,
  Empty,
  FilterButton,
  FilterOption,
  FilterSheet,
  LoadingState,
  PageHeader,
  Screen,
  SearchBar,
  cardShadowStyle,
} from "@/components/ui/ui";
import { useCourses } from "@/features/courses";
import { useApp } from "@/providers/AppProvider";
import type {
  AcademicLevel,
  AcademicTerm,
  Course,
  CourseType,
} from "@/types";

export default function Courses() {
  const { profile } = useApp();
  const { courses, loading, error: coursesError, reload } = useCourses();
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState<string | null>(null);
  const [level, setLevel] = useState<AcademicLevel | null>(null);
  const [term, setTerm] = useState<AcademicTerm | null>(null);
  const [credit, setCredit] = useState<number | null>(null);
  const [courseType, setCourseType] = useState<CourseType | null>(null);
  const [draft, setDraft] = useState<FilterState>({
    department: null,
    level: null,
    term: null,
    credit: null,
    courseType: null,
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const error = coursesError?.message ?? "";

  const departmental = useMemo(
    () =>
      profile?.role === "student"
        ? courses.filter((course) => course.department === profile.department)
        : profile?.role === "teacher"
          ? courses.filter((course) => teachesCourse(course, profile))
          : courses,
    [courses, profile],
  );
  const departmentOptions = useMemo(
    () => [...new Set(departmental.map((course) => course.department))].sort(),
    [departmental],
  );
  const creditOptions = useMemo(
    () =>
      [...new Set(departmental.map((course) => course.credits))].sort(
        (a, b) => a - b,
      ),
    [departmental],
  );
  const visible = useMemo(
    () =>
      departmental.filter((course) => {
        const searchable =
          `${course.code} ${course.title} ${course.teacherNames.join(" ")} ${course.tags.join(" ")}`.toLowerCase();
        return (
          searchable.includes(search.toLowerCase()) &&
          (!department || course.department === department) &&
          (!level || course.level === level) &&
          (!term || course.term === term) &&
          (!credit || course.credits === credit) &&
          (!courseType || course.courseType === courseType)
        );
      }),
    [departmental, search, department, level, term, credit, courseType],
  );
  const activeFilterCount = [
    department,
    level,
    term,
    credit,
    courseType,
  ].filter(Boolean).length;
  const openFilters = () => {
    setDraft({ department, level, term, credit, courseType });
    setFilterOpen(true);
  };
  const applyFilters = () => {
    setDepartment(draft.department);
    setLevel(draft.level);
    setTerm(draft.term);
    setCredit(draft.credit);
    setCourseType(draft.courseType);
    setFilterOpen(false);
  };
  const clearFilters = () =>
    setDraft({
      department: null,
      level: null,
      term: null,
      credit: null,
      courseType: null,
    });

  if (loading) return <LoadingState label="Loading courses…" />;

  return (
    <Screen>
      <FlatList
        data={visible}
        keyExtractor={(course) => course.id}
        className="px-5"
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 28 }}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={() => { void reload() }} />
        }
        ListHeaderComponent={
          <>
            <PageHeader
              title={profile?.role === "teacher" ? "My Courses" : "Courses"}
              subtitle="Explore courses and find what suits you."
            />
            <View className="mt-5">
              <SearchBar
                value={search}
                onChangeText={setSearch}
                placeholder="Search by course code, title, teacher, or tag"
              />
            </View>
            <View className="mt-5 flex-row items-center justify-between">
              <Text className="text-sm text-muted">
                {visible.length} course{visible.length === 1 ? "" : "s"} found
              </Text>
              <FilterButton count={activeFilterCount} onPress={openFilters} />
            </View>
          </>
        }
        ListEmptyComponent={
          <Empty
            title="No courses found"
            body={error || "Try a different search or filter."}
          />
        }
        renderItem={({ item }) => (
          <CourseCard
            course={item}
            onPress={() => router.push(`/course/${item.id}`)}
          />
        )}
      />
      <FilterModal
        open={filterOpen}
        draft={draft}
        departments={departmentOptions}
        credits={creditOptions}
        onChange={setDraft}
        onClear={clearFilters}
        onClose={() => setFilterOpen(false)}
        onApply={applyFilters}
      />
    </Screen>
  );
}

type FilterState = {
  department: string | null;
  level: AcademicLevel | null;
  term: AcademicTerm | null;
  credit: number | null;
  courseType: CourseType | null;
};

function CourseCard({
  course,
  onPress,
}: {
  course: Course;
  onPress: () => void;
}) {
  const colors = courseColor(course.code);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${course.code} ${course.title}`}
      onPress={onPress}
      style={cardShadowStyle}
      className="mb-3 flex-row rounded-2xl border border-line bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
    >
      <View
        style={{ backgroundColor: colors.background }}
        className="h-[92px] w-[92px] items-center justify-center rounded-xl"
      >
        <CourseCode
          code={course.code}
          className="text-base"
          color={colors.text}
        />
      </View>
      <View className="ml-4 min-w-0 flex-1 justify-center">
        <Text
          numberOfLines={2}
          className="text-lg font-extrabold leading-6 text-[#172038] dark:text-white"
        >
          {course.title}
        </Text>
        <Text
          numberOfLines={1}
          className="mt-1 text-sm text-[#64718B] dark:text-slate-400"
        >
          {course.teacherNames.join(", ") || "Teacher assignment pending"}
        </Text>
        <View className="mt-2 flex-row flex-wrap items-center gap-x-3 gap-y-1">
          <Meta
            icon="book-open"
            text={course.level ? `Level ${course.level}` : "Level —"}
          />
          <Meta
            icon="calendar"
            text={course.term ? `Term ${course.term}` : "Term —"}
          />
          <Meta icon="layers" text={course.courseType ?? "Type not set"} />
          <Meta icon="clock" text={`${course.credits} credits`} />
        </View>
        {course.tags.length ? (
          <View className="mt-2 flex-row flex-wrap gap-1.5">
            {course.tags.slice(0, 3).map((tag) => (
              <Text
                key={tag}
                style={{
                  color: colors.text,
                  backgroundColor: colors.background,
                }}
                className="rounded-md px-2 py-1 text-[11px] font-semibold"
              >
                {tag}
              </Text>
            ))}
          </View>
        ) : null}
      </View>
    </Pressable>
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
      <Feather name={icon} size={14} color="#71809A" />
      <Text className="text-xs text-[#64718B] dark:text-slate-400">{text}</Text>
    </View>
  );
}

function FilterModal({
  open,
  draft,
  departments,
  credits,
  onChange,
  onClear,
  onClose,
  onApply,
}: {
  open: boolean;
  draft: FilterState;
  departments: string[];
  credits: number[];
  onChange: (value: FilterState) => void;
  onClear: () => void;
  onClose: () => void;
  onApply: () => void;
}) {
  return (
    <FilterSheet
      open={open}
      title="Filter courses"
      subtitle="Refine the course catalogue."
      onClose={onClose}
      onClear={onClear}
      onApply={onApply}
    >
      <FlatList
        data={[
          {
            label: "Department",
            options: departments,
            value: draft.department,
            key: "department",
          },
          {
            label: "Level",
            options: academicLevels,
            value: draft.level,
            key: "level",
          },
          {
            label: "Term",
            options: academicTerms,
            value: draft.term,
            key: "term",
          },
          {
            label: "Credits",
            options: credits,
            value: draft.credit,
            key: "credit",
          },
          {
            label: "Course type",
            options: courseTypes,
            value: draft.courseType,
            key: "courseType",
          },
        ]}
        keyExtractor={(item) => item.key}
        renderItem={({ item }) => (
          <FilterGroup
            label={item.label}
            options={item.options}
            value={item.value}
            onChange={(value) =>
              onChange({ ...draft, [item.key]: value } as FilterState)
            }
            format={
              item.key === "level"
                ? (value) => `Level ${value}`
                : item.key === "term"
                  ? (value) => `Term ${value}`
                  : item.key === "credit"
                    ? (value) => `${value} credits`
                    : undefined
            }
          />
        )}
        contentContainerStyle={{ paddingBottom: 18 }}
        showsVerticalScrollIndicator={false}
      />
    </FilterSheet>
  );
}

function FilterGroup<T extends string | number>({
  label,
  options,
  value,
  onChange,
  format = (option) => String(option),
}: {
  label: string;
  options: T[];
  value: T | null;
  onChange: (value: T | null) => void;
  format?: (option: T) => string;
}) {
  return (
    <View className="mt-5">
      <Text className="mb-2 text-sm font-semibold text-ink dark:text-white">
        {label}
      </Text>
      <View className="flex-row flex-wrap gap-2">
        <FilterOption
          label="All"
          active={value === null}
          onPress={() => onChange(null)}
        />
        {options.map((option) => (
          <FilterOption
            key={String(option)}
            label={format(option)}
            active={value === option}
            onPress={() => onChange(option)}
          />
        ))}
      </View>
    </View>
  );
}

function courseColor(code: string) {
  const colors = [
    { background: "#E8F0FE", text: "#1261D6" },
    { background: "#EEE8FF", text: "#6B25D9" },
    { background: "#E5F7EA", text: "#13833B" },
    { background: "#FFF6DF", text: "#C28700" },
    { background: "#FFE8EA", text: "#E2413E" },
  ];
  return colors[
    code
      .split("")
      .reduce((total, character) => total + character.charCodeAt(0), 0) %
      colors.length
  ];
}
