import { Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import HomePage from "./pages/HomePage";
import JobMatcherPage from "./pages/JobMatcherPage";
import LlmInferencePage from "./pages/LlmInferencePage";
import DocumentRagPage from "./pages/DocumentRagPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/job-matcher" element={<JobMatcherPage />} />
        <Route path="/llm-inference" element={<LlmInferencePage />} />
        <Route path="/document-rag" element={<DocumentRagPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
