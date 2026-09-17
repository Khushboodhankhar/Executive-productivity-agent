import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import { Link } from "react-router-dom";

function TaskCard({ task, type }) {
  const styles = {
    action: {
      badge: "bg-orange-500/10 text-orange-500 border-orange-500/20",
      label: "ACTION",
      icon: "→",
    },
    overdue: {
      badge: "bg-red-500/10 text-red-500 border-red-500/20",
      label: "OVERDUE",
      icon: "!",
    },
    waiting: {
      badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      label: "WAITING",
      icon: "◷",
    },
    unclear: {
      badge: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
      label: "UNCLEAR",
      icon: "?",
    },
    completed: {
      badge: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      label: "COMPLETED",
      icon: "✓",
    },
  };

  const style = styles[type] || styles.action;

  return (
    <div className="group rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900/70 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={`text-[10px] font-bold tracking-wider px-2.5 py-1 rounded-full border ${style.badge}`}
            >
              {style.label}
            </span>

            {task.confidence !== undefined && (
              <span className="text-[10px] text-slate-400">
                AI {Math.round(task.confidence * 100)}%
              </span>
            )}
          </div>

          <h3 className="text-base font-semibold text-slate-900 dark:text-white">
            {task.title || "Untitled task"}
          </h3>
        </div>

        <div className="w-9 h-9 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold">
          {style.icon}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {task.deadline && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Deadline
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {task.deadline}
            </p>

            {task.deadline_precision && (
              <p className="text-xs text-slate-400 mt-1">
                {task.deadline_precision}
              </p>
            )}
          </div>
        )}

        {task.counterparty && (
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-400">
              Counterparty
            </p>

            <p className="mt-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {task.counterparty}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 border-t border-slate-100 dark:border-white/5 pt-3 flex justify-between">
        <span className="text-xs text-slate-400">
          Owner:{" "}
          <span className="text-slate-600 dark:text-slate-300 font-medium">
            {task.owner || "Unassigned"}
          </span>
        </span>

        <span className="text-xs text-slate-400">
          {task.status === "done" ? "Completed" : "Open"}
        </span>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  tasks,
  type,
  icon,
  emptyText,
}) {
  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
            {icon}
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              {title}
            </h2>

            <p className="text-xs text-slate-400">
              {subtitle}
            </p>
          </div>
        </div>

        <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
          {tasks.length}
        </span>
      </div>

      {tasks.length > 0 ? (
        <div className="grid gap-4">
          {tasks.map((task, index) => (
            <TaskCard
              key={task.task_id || index}
              task={task}
              type={type}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-white/10 p-8 text-center">
          <div className="text-xl mb-2">✓</div>

          <p className="text-sm text-slate-400">
            {emptyText}
          </p>
        </div>
      )}
    </section>
  );
}

export default function Dashboard() {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem("executive-theme") === "dark"
  );

  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);

    localStorage.setItem(
      "executive-theme",
      darkMode ? "dark" : "light"
    );
  }, [darkMode]);

  const fetchBrief = async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const response = await axios.get(
        "http://127.0.0.1:8000/brief"
      );

      console.log("Dashboard API response:", response.data);

      setBrief(response.data);
    } catch (err) {
      console.error("Dashboard API error:", err);

      if (err.response) {
        setError(
          `Backend error: ${err.response.status} ${err.response.statusText}`
        );
      } else {
        setError(
          "Backend is not running or cannot be reached on port 8000."
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBrief();
  }, []);

  const myActions = brief?.my_actions || [];
  const waiting = brief?.waiting_on_others || [];
  const unclear = brief?.unclear_ownership || [];
  const overdue = brief?.overdue || [];
  const completed = brief?.completed || [];

  const allTasks = useMemo(() => {
    return [
      ...myActions,
      ...waiting,
      ...unclear,
      ...overdue,
      ...completed,
    ];
  }, [myActions, waiting, unclear, overdue, completed]);

  const uniqueTasks = useMemo(() => {
    const map = new Map();

    allTasks.forEach((task) => {
      if (!map.has(task.task_id)) {
        map.set(task.task_id, task);
      }
    });

    return Array.from(map.values());
  }, [allTasks]);

  const tasksForDate = useMemo(() => {
    const dateString = selectedDate.toISOString().split("T")[0];

    return uniqueTasks.filter(
      (task) => task.deadline === dateString
    );
  }, [selectedDate, uniqueTasks]);

  const totalTasks = uniqueTasks.length;

  const completionRate =
    totalTasks > 0
      ? Math.round((completed.length / totalTasks) * 100)
      : 0;

  const calendarTaskDates = useMemo(() => {
    return new Set(
      uniqueTasks
        .filter((task) => task.deadline)
        .map((task) => task.deadline)
    );
  }, [uniqueTasks]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-2xl animate-pulse">
            ✦
          </div>

          <p className="mt-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
            AI is preparing your executive brief...
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Analyzing commitments, deadlines and ownership
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-3xl p-8 text-center shadow-xl">
          <div className="text-4xl mb-4">⚠️</div>

          <h1 className="text-xl font-bold">
            Dashboard unavailable
          </h1>

          <p className="mt-3 text-sm text-red-500">
            {error}
          </p>

          <button
            onClick={() => fetchBrief()}
            className="mt-6 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">

      {/* NAVBAR */}
      <header className="sticky top-0 z-40 border-b border-slate-200 dark:border-white/10 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white text-lg shadow-lg">
              ✦
            </div>

            <div>
              <h1 className="font-bold text-sm">
                Executive Intelligence
              </h1>

              <p className="text-[11px] text-slate-400">
                AI Productivity Command Center
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">

            {/* DARK MODE */}
            <button
              onClick={() => setDarkMode((value) => !value)}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Toggle dark mode"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>

            {/* REFRESH */}
            <button
              onClick={() => fetchBrief(true)}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Refresh"
            >
              {refreshing ? "..." : "↻"}
            </button>

            <Link
              to="/ask"
              className="hidden sm:block ml-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white text-sm font-semibold shadow-lg"
            >
              ✦ Ask Agent
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* HERO */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-violet-500 font-bold mb-2">
                Executive Overview
              </p>

              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                Good evening, Arjun.
              </h1>

              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                Your AI-generated productivity intelligence for{" "}
                {brief?.as_of}.
              </p>
            </div>

            <Link
              to="/ask"
              className="sm:hidden px-5 py-3 rounded-xl bg-violet-600 text-white text-sm font-semibold text-center"
            >
              ✦ Ask Agent
            </Link>
          </div>
        </div>

        {/* STAT CARDS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              My Actions
            </p>

            <p className="text-3xl font-bold mt-2 text-orange-500">
              {myActions.length}
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Active commitments
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Overdue
            </p>

            <p className="text-3xl font-bold mt-2 text-red-500">
              {overdue.length}
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Needs attention
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Waiting
            </p>

            <p className="text-3xl font-bold mt-2 text-blue-500">
              {waiting.length}
            </p>

            <p className="text-xs text-slate-400 mt-1">
              Pending from others
            </p>
          </div>

          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-sm">
            <p className="text-xs text-slate-400 uppercase tracking-wider">
              Completion
            </p>

            <p className="text-3xl font-bold mt-2 text-emerald-500">
              {completionRate}%
            </p>

            <p className="text-xs text-slate-400 mt-1">
              {completed.length} completed
            </p>
          </div>
        </div>

        {/* AI INSIGHT + CALENDAR */}
        <div className="grid lg:grid-cols-[1fr_380px] gap-6 mb-10">

          {/* AI INSIGHT */}
          <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 text-white p-7 shadow-xl overflow-hidden relative">

            <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />

            <div className="relative">
              <div className="flex items-center gap-2 mb-5">
                <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  ✦
                </span>

                <span className="text-xs font-bold uppercase tracking-wider text-white/70">
                  AI Executive Insight
                </span>
              </div>

              <h2 className="text-2xl font-bold">
                Your attention is needed on {overdue.length} overdue item
                {overdue.length === 1 ? "" : "s"}.
              </h2>

              <p className="mt-3 text-sm leading-6 text-white/75 max-w-2xl">
                The agent has analyzed your commitments and identified
                deadlines, ownership gaps and pending actions. Use Ask
                Agent to query your executive workload in natural language.
              </p>

              <Link
                to="/ask"
                className="inline-flex mt-6 px-5 py-2.5 rounded-xl bg-white text-violet-700 font-semibold text-sm hover:bg-white/90"
              >
                Ask your AI agent →
              </Link>
            </div>
          </div>

          {/* CALENDAR */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 p-5 shadow-sm">

            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-lg">
                  Executive Calendar
                </h2>

                <p className="text-xs text-slate-400 mt-1">
                  Task deadlines
                </p>
              </div>

              <span className="text-xs px-3 py-1 rounded-full bg-violet-500/10 text-violet-500 font-semibold">
                {uniqueTasks.filter((t) => t.deadline).length} dates
              </span>
            </div>

            <div className="executive-calendar">
              <Calendar
                onChange={setSelectedDate}
                value={selectedDate}
                tileClassName={({ date, view }) => {
                  if (view !== "month") return null;

                  const dateString = date
                    .toISOString()
                    .split("T")[0];

                  return calendarTaskDates.has(dateString)
                    ? "has-task"
                    : null;
                }}
              />
            </div>

            <div className="mt-5 border-t border-slate-100 dark:border-white/10 pt-4">

              <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                Selected date
              </p>

              <p className="font-semibold text-sm">
                {selectedDate.toLocaleDateString("en-IN", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>

              {tasksForDate.length > 0 ? (
                <div className="mt-3 space-y-2">
                  {tasksForDate.map((task) => (
                    <div
                      key={task.task_id}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                    >
                      <p className="text-sm font-medium">
                        {task.title}
                      </p>

                      <p className="text-xs text-slate-400 mt-1">
                        {task.status === "done"
                          ? "Completed"
                          : "Open"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mt-3">
                  No deadlines on this date.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* TASK SECTIONS */}
        <div className="space-y-10">

          <Section
            title="My Actions"
            subtitle="Commitments assigned to you"
            tasks={myActions}
            type="action"
            icon="→"
            emptyText="No active actions."
          />

          <Section
            title="Overdue"
            subtitle="Items requiring immediate attention"
            tasks={overdue}
            type="overdue"
            icon="!"
            emptyText="Nothing overdue. Excellent."
          />

          <Section
            title="Waiting on Others"
            subtitle="External dependencies"
            tasks={waiting}
            type="waiting"
            icon="◷"
            emptyText="Nothing pending from others."
          />

          <Section
            title="Unclear Ownership"
            subtitle="Commitments requiring clarification"
            tasks={unclear}
            type="unclear"
            icon="?"
            emptyText="Ownership is clear across all tasks."
          />

          <Section
            title="Completed"
            subtitle="Recently completed commitments"
            tasks={completed}
            type="completed"
            icon="✓"
            emptyText="No completed tasks yet."
          />
        </div>

        {/* FOOTER */}
        <div className="mt-12 pb-6 text-center">
          <p className="text-xs text-slate-400">
            Executive Productivity Agent · AI-powered commitment intelligence
          </p>
        </div>
      </main>

      {/* CALENDAR CUSTOM CSS */}
      <style>{`
        .executive-calendar .react-calendar {
          width: 100%;
          border: none;
          background: transparent;
          font-family: inherit;
        }

        .executive-calendar .react-calendar__navigation {
          margin-bottom: 8px;
        }

        .executive-calendar .react-calendar__navigation button {
          min-width: 36px;
          background: transparent;
          border-radius: 10px;
          font-weight: 600;
          color: inherit;
        }

        .executive-calendar .react-calendar__navigation button:hover {
          background: rgba(139, 92, 246, 0.1);
        }

        .executive-calendar .react-calendar__month-view__weekdays {
          font-size: 10px;
          text-transform: uppercase;
          color: #94a3b8;
          font-weight: 700;
        }

        .executive-calendar .react-calendar__tile {
          border-radius: 10px;
          padding: 10px 4px;
          color: inherit;
          background: transparent;
          font-size: 13px;
        }

        .executive-calendar .react-calendar__tile:hover {
          background: rgba(139, 92, 246, 0.1);
        }

        .executive-calendar .react-calendar__tile--now {
          background: rgba(139, 92, 246, 0.12);
          color: #7c3aed;
          font-weight: 700;
        }

        .executive-calendar .react-calendar__tile--active {
          background: #7c3aed !important;
          color: white !important;
        }

        .executive-calendar .react-calendar__tile.has-task {
          position: relative;
          font-weight: 700;
        }

        .executive-calendar .react-calendar__tile.has-task::after {
          content: "";
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #f97316;
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
        }

        .dark .executive-calendar .react-calendar__month-view__days__day--neighboringMonth {
          color: #475569;
        }

        .dark .executive-calendar .react-calendar__tile {
          color: #e2e8f0;
        }

        .dark .executive-calendar .react-calendar__navigation button {
          color: #e2e8f0;
        }
      `}</style>
    </div>
  );
}