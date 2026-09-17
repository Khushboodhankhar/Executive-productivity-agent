import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";

export default function CalendarWidget() {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <Calendar />
    </div>
  );
}
