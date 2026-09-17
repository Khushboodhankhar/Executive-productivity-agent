import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Link, useNavigate } from "react-router-dom";

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDeadline(deadline) {
  if (!deadline) return "No deadline";

  const date = new Date(`${deadline}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ task }) {
  const isDone = task.status === "done";

  if (isDone) {
    return (
      <span className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
        ✓ Completed
      </span>
    );
  }

  return (
    <span className="rounded-lg bg-orange-400 px-3 py-1.5 text-xs font-bold text-white shadow-sm">
      Due {task.deadline_precision || "Soon"}
    </span>
  );
}

function TaskCard({ task, darkMode, compact = false }) {
  const navigate = useNavigate();

  const askAboutTask = () => {
    const question = `Tell me about this task: "${task.title}". Deadline: ${
      task.deadline || "No deadline"
    }. Status: ${task.status}. Owner: ${
      task.owner || "Unclear"
    }.`;

    navigate(`/ask?question=${encodeURIComponent(question)}`);
  };

  const isDone = task.status === "done";

  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl ${
        darkMode
          ? "border-white/10 bg-white/[0.06] hover:bg-white/[0.09]"
          : "border-white/70 bg-white/80 shadow-sm hover:bg-white"
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-lg ${
            isDone
              ? "bg-emerald-100 dark:bg-emerald-500/20"
              : "bg-amber-100 dark:bg-amber-500/20"
          }`}
        >
          {isDone ? "✓" : "⭐"}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3
                className={`font-bold ${
                  compact ? "text-sm" : "text-base"
                }`}
              >
                {task.title}
              </h3>

              <p className="mt-1 text-xs opacity-50">
                {task.owner || "Ownership unclear"}
                {task.counterparty
                  ? ` • ${task.counterparty}`
                  : ""}
              </p>
            </div>

            <StatusBadge task={task} />
          </div>

          {!compact && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs opacity-65">
              <span>
                📅 {formatDeadline(task.deadline)}
              </span>

              <span>
                ● {task.status}
              </span>
            </div>
          )}

          <button
            onClick={askAboutTask}
            className="mt-3 text-xs font-bold text-purple-600 transition hover:text-pink-500 dark:text-purple-300 dark:hover:text-pink-300"
          >
            Ask Agent →
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title, count }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <h2 className="text-lg font-extrabold">{title}</h2>
      </div>

      <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-bold text-purple-700 dark:bg-purple-500/20 dark:text-purple-300">
        {count}
      </span>
    </div>
  );
}

function GlassCard({ children, darkMode, className = "" }) {
  return (
    <div
      className={`rounded-3xl border backdrop-blur-xl ${
        darkMode
          ? "border-white/10 bg-white/[0.045] shadow-2xl shadow-black/20"
          : "border-white/80 bg-white/75 shadow-xl shadow-purple-100/50"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("executive-theme") === "dark";
  });

  const [selectedDate, setSelectedDate] = useState(
    new Date()
  );

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      darkMode
    );

    document.documentElement.style.colorScheme = darkMode
      ? "dark"
      : "light";

    localStorage.setItem(
      "executive-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  const fetchBrief = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        "http://127.0.0.1:8000/brief"
      );

      setBrief(response.data);
    } catch (err) {
      console.error(err);
      setError(
        "Backend se executive brief load nahi ho raha."
      );
    } finally {
      setLoading(false);
    }
  };

  const refreshBrief = async () => {
    try {
      setRefreshing(true);
      setError("");

      const response = await axios.post(
        "http://127.0.0.1:8000/brief/refresh"
      );

      setBrief(response.data);
    } catch (err) {
      console.error(err);
      setError("AI brief refresh nahi ho paya.");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  const allTasks = useMemo(() => {
    if (!brief) return [];

    return [
      ...(brief.my_actions || []),
      ...(brief.waiting_on_others || []),
      ...(brief.unclear_ownership || []),
      ...(brief.overdue || []),
      ...(brief.completed || []),
    ];
  }, [brief]);

  const uniqueTasks = useMemo(() => {
    const map = new Map();

    allTasks.forEach((task) => {
      map.set(task.task_id, task);
    });

    return Array.from(map.values());
  }, [allTasks]);

  const selectedDateString =
    formatLocalDate(selectedDate);

  const selectedDateTasks = useMemo(() => {
    return uniqueTasks.filter(
      (task) =>
        task.deadline === selectedDateString
    );
  }, [uniqueTasks, selectedDateString]);

  const taskDates = useMemo(() => {
    return new Set(
      uniqueTasks
        .filter((task) => task.deadline)
        .map((task) => task.deadline)
    );
  }, [uniqueTasks]);

  const myActions = brief?.my_actions || [];
  const waiting = brief?.waiting_on_others || [];
  const unclear = brief?.unclear_ownership || [];
  const overdue = brief?.overdue || [];
  const completed = brief?.completed || [];

  const completion =
    uniqueTasks.length > 0
      ? Math.round(
          (completed.length / uniqueTasks.length) * 100
        )
      : 0;

  const askAboutDate = () => {
    const tasks =
      selectedDateTasks.length > 0
        ? selectedDateTasks
            .map(
              (task) =>
                `- ${task.title} | ${task.status} | Owner: ${
                  task.owner || "Unclear"
                }`
            )
            .join("\n")
        : "No tasks found.";

    const question = `Give me an executive summary of my tasks for ${selectedDateString}.\n\n${tasks}`;

    navigate(
      `/ask?question=${encodeURIComponent(question)}`
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-[#070b18]">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-purple-200 border-t-purple-600" />
          <p className="mt-5 font-semibold text-gray-700 dark:text-white">
            Loading Executive Command Center...
          </p>
        </div>
      </div>
    );
  }

  if (error && !brief) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 dark:bg-[#070b18]">
        <div className="rounded-3xl bg-white p-8 text-center shadow-xl dark:bg-gray-900">
          <div className="text-4xl">⚠️</div>
          <h2 className="mt-3 text-xl font-bold">
            Dashboard unavailable
          </h2>
          <p className="mt-2 text-sm opacity-60">
            {error}
          </p>

          <button
            onClick={fetchBrief}
            className="mt-5 rounded-xl bg-purple-600 px-5 py-3 font-semibold text-white"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative min-h-screen overflow-hidden transition-colors duration-500 ${
        darkMode
          ? "bg-[#070b18] text-white"
          : "bg-[#f7f8fc] text-slate-900"
      }`}
    >
      {/* BACKGROUND BLOBS */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div
          className={`absolute -left-32 -top-32 h-96 w-96 rounded-full blur-3xl ${
            darkMode
              ? "bg-blue-700/20"
              : "bg-blue-300/35"
          }`}
        />

        <div
          className={`absolute right-0 top-20 h-96 w-96 rounded-full blur-3xl ${
            darkMode
              ? "bg-purple-700/20"
              : "bg-purple-300/35"
          }`}
        />

        <div
          className={`absolute bottom-0 left-1/3 h-96 w-96 rounded-full blur-3xl ${
            darkMode
              ? "bg-teal-700/15"
              : "bg-pink-300/25"
          }`}
        />
      </div>

      {/* HEADER */}

      <header
        className={`sticky top-0 z-50 border-b backdrop-blur-2xl ${
          darkMode
            ? "border-white/10 bg-[#070b18]/80"
            : "border-white/70 bg-white/75"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 text-xl shadow-lg">
              💼
            </div>

            <div>
              <h1 className="text-base font-extrabold sm:text-lg">
                Executive Productivity Agent
              </h1>

              <p className="text-[11px] opacity-50">
                Executive Command Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() =>
                setDarkMode((value) => !value)
              }
              className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold transition ${
                darkMode
                  ? "bg-yellow-400 text-gray-900 hover:bg-yellow-300"
                  : "bg-slate-900 text-white hover:bg-slate-700"
              }`}
            >
              {darkMode ? "☀️" : "🌙"}
              <span className="hidden sm:inline">
                {darkMode ? "Light" : "Dark"}
              </span>
            </button>

            <button
              onClick={refreshBrief}
              disabled={refreshing}
              className="flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 disabled:opacity-50"
            >
              <span className={refreshing ? "animate-spin" : ""}>
                ↻
              </span>
              <span className="hidden sm:inline">
                {refreshing ? "Refreshing" : "Refresh"}
              </span>
            </button>

            <Link
              to="/ask"
              className="hidden h-10 items-center rounded-xl bg-blue-600 px-4 text-sm font-bold text-white shadow-lg transition hover:bg-blue-700 sm:flex"
            >
              Ask Agent
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-7xl px-5 py-7 lg:px-8">
        {/* GREETING */}

        <div className="mb-7">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-600 dark:text-purple-300">
            Executive Overview
          </p>

          <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
            Good Morning, Khushboo!
          </h2>

          <p className="mt-2 text-sm opacity-55">
            Here is your current workload and priority snapshot.
          </p>
        </div>

        {/* TOP STATS */}

        <div className="mb-7 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-60">
                My Actions
              </span>
              <span className="text-xl">⭐</span>
            </div>

            <p className="mt-3 text-3xl font-black">
              {myActions.length}
            </p>

            <p className="mt-1 text-xs text-purple-600 dark:text-purple-300">
              Active commitments
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-60">
                Overdue
              </span>
              <span className="text-xl">🔴</span>
            </div>

            <p className="mt-3 text-3xl font-black text-red-500">
              {overdue.length}
            </p>

            <p className="mt-1 text-xs text-red-500">
              Needs attention
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-60">
                Waiting
              </span>
              <span className="text-xl">🟡</span>
            </div>

            <p className="mt-3 text-3xl font-black text-orange-500">
              {waiting.length}
            </p>

            <p className="mt-1 text-xs text-orange-500">
              From other people
            </p>
          </div>

          <div className="rounded-2xl border border-white/70 bg-white/75 p-5 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.05]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold opacity-60">
                Completed
              </span>
              <span className="text-xl">🟢</span>
            </div>

            <p className="mt-3 text-3xl font-black text-emerald-500">
              {completion}%
            </p>

            <p className="mt-1 text-xs text-emerald-500">
              Overall completion
            </p>
          </div>
        </div>

        {/* MAIN GRID */}

        <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
          {/* LEFT */}

          <div className="space-y-6">
            {/* MY ACTIONS */}

            <GlassCard darkMode={darkMode} className="p-5">
              <SectionTitle
                icon="⭐"
                title="My Actions"
                count={myActions.length}
              />

              {myActions.length > 0 ? (
                <div className="space-y-3">
                  {myActions.map((task) => (
                    <TaskCard
                      key={task.task_id}
                      task={task}
                      darkMode={darkMode}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-black/5 p-5 text-center text-sm opacity-60 dark:bg-white/5">
                  No active actions.
                </p>
              )}
            </GlassCard>

            {/* WAITING */}

            <GlassCard darkMode={darkMode} className="p-5">
              <SectionTitle
                icon="🟡"
                title="Waiting on Others"
                count={waiting.length}
              />

              {waiting.length > 0 ? (
                <div className="space-y-3">
                  {waiting.map((task) => (
                    <TaskCard
                      key={task.task_id}
                      task={task}
                      darkMode={darkMode}
                    />
                  ))}
                </div>
              ) : (
                <p className="rounded-2xl bg-black/5 p-5 text-center text-sm opacity-60 dark:bg-white/5">
                  Nothing currently waiting.
                </p>
              )}
            </GlassCard>

            {/* ATTENTION */}

            {(overdue.length > 0 || unclear.length > 0) && (
              <GlassCard
                darkMode={darkMode}
                className="p-5"
              >
                <SectionTitle
                  icon="🚨"
                  title="Needs Attention"
                  count={
                    overdue.length + unclear.length
                  }
                />

                <div className="space-y-3">
                  {overdue.map((task) => (
                    <div
                      key={`overdue-${task.task_id}`}
                      className="rounded-2xl border border-red-200 bg-red-50/70 p-4 dark:border-red-500/20 dark:bg-red-500/10"
                    >
                      <div className="flex gap-3">
                        <span className="text-xl">🔴</span>

                        <div>
                          <h3 className="font-bold">
                            {task.title}
                          </h3>

                          <p className="mt-1 text-xs text-red-600 dark:text-red-300">
                            Deadline passed:{" "}
                            {formatDeadline(task.deadline)}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const question = `What should I do about this overdue task: "${task.title}"?`;

                          navigate(
                            `/ask?question=${encodeURIComponent(
                              question
                            )}`
                          );
                        }}
                        className="mt-3 text-xs font-bold text-red-600 dark:text-red-300"
                      >
                        Ask Agent →
                      </button>
                    </div>
                  ))}

                  {unclear.map((task) => (
                    <TaskCard
                      key={`unclear-${task.task_id}`}
                      task={task}
                      darkMode={darkMode}
                    />
                  ))}
                </div>
              </GlassCard>
            )}
          </div>

          {/* RIGHT */}

          <div className="space-y-6">
            {/* CALENDAR */}

            <GlassCard darkMode={darkMode} className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">
                    Calendar Overview
                  </h2>

                  <p className="mt-1 text-xs opacity-50">
                    Click a date to view tasks
                  </p>
                </div>

                <span className="rounded-xl bg-pink-100 px-3 py-2 text-lg dark:bg-pink-500/15">
                  📅
                </span>
              </div>

              <Calendar
                value={selectedDate}
                onChange={setSelectedDate}
                tileClassName={({ date, view }) => {
                  if (view !== "month") return null;

                  return taskDates.has(
                    formatLocalDate(date)
                  )
                    ? "has-task"
                    : null;
                }}
              />
            </GlassCard>

            {/* DAILY BRIEF */}

            <div
              className={`relative overflow-hidden rounded-3xl p-6 shadow-xl ${
                darkMode
                  ? "bg-gradient-to-br from-blue-900 via-purple-900 to-slate-950"
                  : "bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 text-white"
              }`}
            >
              <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

              <div className="relative">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">
                      AI Assistant
                    </p>

                    <h2 className="mt-1 text-2xl font-black">
                      Daily Brief
                    </h2>
                  </div>

                  <span className="text-2xl">✨</span>
                </div>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                    <p className="text-sm font-bold">
                      ⭐ {myActions.length} Active Actions
                    </p>

                    <p className="mt-1 text-xs opacity-70">
                      Commitments assigned to you
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                    <p className="text-sm font-bold">
                      🔴 {overdue.length} Overdue Item
                      {overdue.length === 1 ? "" : "s"}
                    </p>

                    <p className="mt-1 text-xs opacity-70">
                      Requires your attention
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                    <p className="text-sm font-bold">
                      🟡 {waiting.length} Waiting
                    </p>

                    <p className="mt-1 text-xs opacity-70">
                      Pending from others
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    const question =
                      "Give me a concise executive daily brief. Tell me my active priorities, overdue tasks, waiting items, unclear ownership and what I should focus on next.";

                    navigate(
                      `/ask?question=${encodeURIComponent(
                        question
                      )}`
                    );
                  }}
                  className="mt-5 w-full rounded-xl bg-white px-4 py-3 text-sm font-black text-purple-700 shadow-lg transition hover:scale-[1.01]"
                >
                  Ask AI for Daily Brief →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* SELECTED DATE */}

        <GlassCard
          darkMode={darkMode}
          className="mt-6 p-5"
        >
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-300">
                Selected Date
              </p>

              <h2 className="mt-1 text-xl font-black">
                {selectedDate.toLocaleDateString(
                  "en-IN",
                  {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  }
                )}
              </h2>
            </div>

            <button
              onClick={askAboutDate}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-pink-500 px-5 py-3 text-sm font-bold text-white shadow-lg"
            >
              Ask Agent about this date →
            </button>
          </div>

          {selectedDateTasks.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {selectedDateTasks.map((task) => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  darkMode={darkMode}
                  compact
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl bg-black/5 p-7 text-center dark:bg-white/5">
              <div className="text-3xl">📭</div>

              <p className="mt-2 font-bold">
                No tasks on this date
              </p>

              <p className="mt-1 text-xs opacity-50">
                Select another date from the calendar.
              </p>
            </div>
          )}
        </GlassCard>

        {/* COMPLETED */}

        {completed.length > 0 && (
          <GlassCard
            darkMode={darkMode}
            className="mt-6 p-5"
          >
            <SectionTitle
              icon="🟢"
              title="Completed"
              count={completed.length}
            />

            <div className="grid gap-3 md:grid-cols-2">
              {completed.map((task) => (
                <TaskCard
                  key={task.task_id}
                  task={task}
                  darkMode={darkMode}
                  compact
                />
              ))}
            </div>
          </GlassCard>
        )}

        <footer className="py-8 text-center text-xs opacity-40">
          Executive Productivity Agent • AI-powered
          command center
        </footer>
      </main>
    </div>
  );
}