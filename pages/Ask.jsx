export default function Ask() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Ask Agent</h1>
      <input type="text" placeholder="Type your question..." className="w-full p-2 border rounded mb-4" />
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <p>Answer will appear here...</p>
      </div>
    </div>
  );
}
